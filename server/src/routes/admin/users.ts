import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import * as XLSX from "xlsx";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin, requireStaff } from "../../middleware/auth";
import { isOwner, currentUserId } from "../../lib/ownership";
import { SchoolLevel } from "@prisma/client";

const router = Router();

// Multer config: memory storage (buffer, no disk)
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication + admin role
router.use(authenticate, requireStaff);

/** Vérifie qu'un élève appartient à une classe gérée par le prof courant (Owner = toujours OK). */
async function studentInTeacherScope(req: Request, studentId: number): Promise<boolean> {
  if (isOwner(req)) return true;
  const student = await prisma.user.findFirst({
    where: { id: studentId, role: "STUDENT", class: { teacherId: currentUserId(req) } },
    select: { id: true },
  });
  return !!student;
}

// ---------- GET /teachers - Liste des profs (pour le sélecteur de partage) ----------
router.get("/teachers", async (req: Request, res: Response): Promise<void> => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", id: { not: currentUserId(req) } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    });
    res.json({ teachers });
  } catch (error) {
    console.error("Erreur teachers GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Valid school levels
const VALID_LEVELS: string[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

// Helper: normalize a string (remove accents, lowercase, strip non-alpha)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

// Helper: generate unique username as prenomN (first name + first letter of last name)
async function generateUsername(
  firstName: string,
  lastName: string
): Promise<string> {
  const base = `${normalize(firstName)}${normalize(lastName).charAt(0)}`;

  // Check if the base username already exists
  const existing = await prisma.user.findUnique({
    where: { username: base },
  });

  if (!existing) {
    return base;
  }

  // Append incrementing number starting at 2
  let counter = 2;
  while (true) {
    const candidate = `${base}${counter}`;
    const found = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!found) {
      return candidate;
    }
    counter++;
  }
}

// Shared select fields for user queries
const userSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  level: true,
  classId: true,
  class: { select: { id: true, name: true, level: true } },
  createdAt: true,
  updatedAt: true,
};

/** Résout une classe par id et renvoie son niveau (pour synchroniser User.level). */
async function resolveClass(classId: number): Promise<{ id: number; level: SchoolLevel } | null> {
  return prisma.class.findUnique({ where: { id: classId }, select: { id: true, level: true } });
}

// ---------- GET / - List all users (students AND admins) ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, role, search, classId } = req.query;

    const where: Record<string, unknown> = {};

    // Cloisonnement prof : ne voit que les élèves de ses classes
    if (!isOwner(req)) {
      where.role = "STUDENT";
      where.class = { teacherId: currentUserId(req) };
    }

    // Filter by class
    if (classId && typeof classId === "string") {
      const cid = parseInt(classId, 10);
      if (!isNaN(cid)) where.classId = cid;
    }

    // Filter by level
    if (level && typeof level === "string") {
      if (!VALID_LEVELS.includes(level.toUpperCase())) {
        res.status(400).json({ error: "Niveau scolaire invalide" });
        return;
      }
      where.level = level.toUpperCase();
    }

    // Filter by role
    if (role && typeof role === "string") {
      const upperRole = role.toUpperCase();
      if (upperRole !== "ADMIN" && upperRole !== "STUDENT") {
        res.status(400).json({ error: "Rôle invalide. Utilisez ADMIN ou STUDENT" });
        return;
      }
      where.role = upperRole;
    }

    // Search by firstName, lastName, or username
    if (search && typeof search === "string") {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { firstName: "asc" },
    });

    res.json({ users });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST / - Create a user (student or admin) ----------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, level, password, role, classId } = req.body;

    const userRole: string = role ? role.toUpperCase() : "STUDENT";

    if (userRole !== "ADMIN" && userRole !== "STUDENT" && userRole !== "TEACHER") {
      res.status(400).json({ error: "Rôle invalide. Utilisez ADMIN, TEACHER ou STUDENT" });
      return;
    }

    // Seul l'Owner peut créer des comptes ADMIN ou TEACHER
    if (userRole !== "STUDENT" && !isOwner(req)) {
      res.status(403).json({ error: "Seul le propriétaire peut créer des comptes professeur/admin" });
      return;
    }

    // Classe (optionnelle) : si fournie, elle impose le niveau de l'élève
    let resolvedLevel: SchoolLevel | null = level ? (level.toUpperCase() as SchoolLevel) : null;
    let resolvedClassId: number | null = null;
    if (classId !== undefined && classId !== null) {
      const cid = parseInt(String(classId), 10);
      const cls = isNaN(cid) ? null : await resolveClass(cid);
      if (!cls) {
        res.status(400).json({ error: "Classe introuvable" });
        return;
      }
      resolvedClassId = cls.id;
      resolvedLevel = cls.level; // la classe porte le niveau
    }

    // Un prof ne peut inscrire un élève que dans une de SES classes
    if (!isOwner(req)) {
      if (resolvedClassId == null) {
        res.status(400).json({ error: "Un professeur doit rattacher l'élève à une de ses classes" });
        return;
      }
      const owned = await prisma.class.findFirst({
        where: { id: resolvedClassId, teacherId: currentUserId(req) },
        select: { id: true },
      });
      if (!owned) {
        res.status(403).json({ error: "Cette classe n'est pas la vôtre" });
        return;
      }
    }

    if (!firstName || !lastName || !password) {
      res.status(400).json({
        error: "Les champs firstName, lastName et password sont requis",
      });
      return;
    }

    // Validate explicit level format if provided
    if (resolvedLevel && !VALID_LEVELS.includes(resolvedLevel)) {
      res.status(400).json({ error: "Niveau scolaire invalide" });
      return;
    }

    // For students, a level is required (directly or via class)
    if (userRole === "STUDENT" && !resolvedLevel) {
      res.status(400).json({
        error: "Le niveau scolaire (ou une classe) est requis pour les élèves",
      });
      return;
    }

    const username = await generateUsername(firstName, lastName);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: userRole as "ADMIN" | "STUDENT",
        level: resolvedLevel,
        classId: resolvedClassId,
      },
      select: userSelect,
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /:id - Update a user ----------
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    // Cloisonnement prof : ne peut modifier qu'un élève de ses classes
    if (!(await studentInTeacherScope(req, id))) {
      res.status(403).json({ error: "Accès refusé : cet élève n'est pas dans vos classes" });
      return;
    }

    const { firstName, lastName, level, password, role, classId } = req.body;

    const data: Record<string, unknown> = {};

    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;

    // Classe : si fournie, elle impose le niveau ; null = détacher
    if (classId !== undefined) {
      if (classId === null) {
        data.classId = null;
      } else {
        const cid = parseInt(String(classId), 10);
        const cls = isNaN(cid) ? null : await resolveClass(cid);
        if (!cls) {
          res.status(400).json({ error: "Classe introuvable" });
          return;
        }
        data.classId = cls.id;
        data.level = cls.level; // synchronise le niveau sur la classe
      }
    }

    if (role !== undefined) {
      const upperRole = role.toUpperCase();
      if (upperRole !== "ADMIN" && upperRole !== "STUDENT") {
        res.status(400).json({ error: "Rôle invalide. Utilisez ADMIN ou STUDENT" });
        return;
      }
      data.role = upperRole;
    }

    if (level !== undefined) {
      if (level === null) {
        data.level = null;
      } else {
        if (!VALID_LEVELS.includes(level.toUpperCase())) {
          res.status(400).json({ error: "Niveau scolaire invalide" });
          return;
        }
        data.level = level.toUpperCase();
      }
    }

    if (password !== undefined) {
      data.password = await bcrypt.hash(password, 10);
    }

    // Regenerate username if firstName or lastName changed
    if (firstName !== undefined || lastName !== undefined) {
      const newFirstName = firstName ?? existingUser.firstName;
      const newLastName = lastName ?? existingUser.lastName;
      const newBase = `${normalize(newFirstName)}${normalize(newLastName).charAt(0)}`;
      const oldBase = `${normalize(existingUser.firstName)}${normalize(existingUser.lastName).charAt(0)}`;

      if (newBase !== oldBase) {
        data.username = await generateUsername(newFirstName, newLastName);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    res.json({ user });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- DELETE /:id - Delete a user (cannot delete yourself) ----------
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    // Cannot delete yourself
    if (req.user && req.user.userId === id) {
      res.status(400).json({
        error: "Vous ne pouvez pas supprimer votre propre compte",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    // Cloisonnement prof : ne peut supprimer qu'un élève de ses classes
    if (!(await studentInTeacherScope(req, id))) {
      res.status(403).json({ error: "Accès refusé : cet élève n'est pas dans vos classes" });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST /import - Bulk import students from Excel/CSV (Owner uniquement) ----------
router.post(
  "/import",
  requireAdmin,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier fourni" });
        return;
      }

      // Parse the file from buffer
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: "Le fichier ne contient aucune feuille" });
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) {
        res.status(400).json({ error: "Le fichier est vide" });
        return;
      }

      const errors: string[] = [];
      let created = 0;
      const createdUsers: { prenom: string; nom: string; identifiant: string; motDePasse: string; niveau: string }[] = [];

      // Generate a random 5-char password
      function randomPassword(): string {
        const chars = "abcdefghjkmnpqrstuvwxyz23456789";
        let result = "";
        for (let i = 0; i < 5; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }

      // Précharge les classes (résolution par nom, insensible à la casse) pour la colonne CLASSE
      const allClasses = await prisma.class.findMany({ select: { id: true, name: true, level: true } });
      const classByName = new Map(allClasses.map((c) => [c.name.toLowerCase().trim(), c]));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Row 1 is headers, data starts at row 2

        // Find columns case-insensitively
        const keys = Object.keys(row);
        const prenomKey = keys.find(
          (k) => k.toLowerCase().trim() === "prenom" || k.toLowerCase().trim() === "prénom"
        );
        const nomKey = keys.find((k) => k.toLowerCase().trim() === "nom");
        const niveauKey = keys.find(
          (k) => k.toLowerCase().trim() === "niveau"
        );
        const classeKey = keys.find((k) => k.toLowerCase().trim() === "classe");

        const prenom = prenomKey ? String(row[prenomKey]).trim() : "";
        const nom = nomKey ? String(row[nomKey]).trim() : "";
        const niveau = niveauKey ? String(row[niveauKey]).trim().toUpperCase() : "";
        const classeName = classeKey ? String(row[classeKey]).trim() : "";

        // Validate required fields
        if (!prenom) {
          errors.push(`Ligne ${rowNum}: prénom manquant`);
          continue;
        }
        if (!nom) {
          errors.push(`Ligne ${rowNum}: nom manquant`);
          continue;
        }

        // Résolution de la classe (optionnelle) : si présente, elle impose le niveau
        let classId: number | null = null;
        let effectiveLevel = niveau;
        if (classeName) {
          const cls = classByName.get(classeName.toLowerCase());
          if (!cls) {
            errors.push(`Ligne ${rowNum}: classe "${classeName}" introuvable`);
            continue;
          }
          classId = cls.id;
          effectiveLevel = cls.level; // la classe porte le niveau
        }

        if (!effectiveLevel) {
          errors.push(`Ligne ${rowNum}: niveau ou classe manquant`);
          continue;
        }
        if (!VALID_LEVELS.includes(effectiveLevel)) {
          errors.push(
            `Ligne ${rowNum}: niveau invalide "${effectiveLevel}" (attendu: CP, CE1, CE2, CM1, CM2)`
          );
          continue;
        }

        try {
          const username = await generateUsername(prenom, nom);
          const plainPassword = randomPassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);

          await prisma.user.create({
            data: {
              username,
              password: hashedPassword,
              firstName: prenom,
              lastName: nom,
              role: "STUDENT",
              level: effectiveLevel as SchoolLevel,
              classId,
            },
          });

          createdUsers.push({ prenom, nom, identifiant: username, motDePasse: plainPassword, niveau: effectiveLevel });
          created++;
        } catch (err) {
          errors.push(
            `Ligne ${rowNum}: erreur lors de la création de ${prenom} ${nom}`
          );
          console.error(`Import error at row ${rowNum}:`, err);
        }
      }

      res.json({ created, errors, createdUsers });
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

// ---------- PUT /bulk-update - Bulk update users (Owner uniquement) ----------
router.put(
  "/bulk-update",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids, level } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "La liste des IDs est requise" });
        return;
      }

      if (level !== undefined) {
        if (!VALID_LEVELS.includes(level.toUpperCase())) {
          res.status(400).json({ error: "Niveau scolaire invalide" });
          return;
        }
      }

      const result = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: level !== undefined ? { level: level.toUpperCase() as SchoolLevel } : {},
      });

      res.json({ updated: result.count });
    } catch (error) {
      console.error("Erreur lors de la mise à jour en masse:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

// ---------- DELETE /bulk-delete - Bulk delete users ----------
router.delete(
  "/bulk-delete",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "La liste des IDs est requise" });
        return;
      }

      // Cannot delete yourself
      const currentUserId = req.user?.userId;
      if (currentUserId && ids.includes(currentUserId)) {
        res.status(400).json({
          error: "Vous ne pouvez pas supprimer votre propre compte",
        });
        return;
      }

      const result = await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });

      res.json({ deleted: result.count });
    } catch (error) {
      console.error("Erreur lors de la suppression en masse:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

export default router;
