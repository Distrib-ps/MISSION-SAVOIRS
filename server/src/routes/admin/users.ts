import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import * as XLSX from "xlsx";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { SchoolLevel } from "@prisma/client";

const router = Router();

// Multer config: memory storage (buffer, no disk)
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

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
  createdAt: true,
  updatedAt: true,
};

// ---------- GET / - List all users (students AND admins) ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, role, search } = req.query;

    const where: Record<string, unknown> = {};

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
    const { firstName, lastName, level, password, role } = req.body;

    const userRole: string = role ? role.toUpperCase() : "STUDENT";

    if (userRole !== "ADMIN" && userRole !== "STUDENT") {
      res.status(400).json({ error: "Rôle invalide. Utilisez ADMIN ou STUDENT" });
      return;
    }

    if (!firstName || !lastName || !password) {
      res.status(400).json({
        error: "Les champs firstName, lastName et password sont requis",
      });
      return;
    }

    // For students, level is required
    if (userRole === "STUDENT") {
      if (!level) {
        res.status(400).json({
          error: "Le niveau scolaire est requis pour les élèves",
        });
        return;
      }
      if (!VALID_LEVELS.includes(level.toUpperCase())) {
        res.status(400).json({ error: "Niveau scolaire invalide" });
        return;
      }
    }

    // For admins, validate level only if provided
    if (userRole === "ADMIN" && level) {
      if (!VALID_LEVELS.includes(level.toUpperCase())) {
        res.status(400).json({ error: "Niveau scolaire invalide" });
        return;
      }
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
        level: userRole === "STUDENT"
          ? (level.toUpperCase() as SchoolLevel)
          : level
            ? (level.toUpperCase() as SchoolLevel)
            : null,
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

    const { firstName, lastName, level, password, role } = req.body;

    const data: Record<string, unknown> = {};

    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;

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

    await prisma.user.delete({ where: { id } });

    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST /import - Bulk import students from Excel/CSV ----------
router.post(
  "/import",
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

        const prenom = prenomKey ? String(row[prenomKey]).trim() : "";
        const nom = nomKey ? String(row[nomKey]).trim() : "";
        const niveau = niveauKey ? String(row[niveauKey]).trim().toUpperCase() : "";

        // Validate required fields
        if (!prenom) {
          errors.push(`Ligne ${rowNum}: prénom manquant`);
          continue;
        }
        if (!nom) {
          errors.push(`Ligne ${rowNum}: nom manquant`);
          continue;
        }
        if (!niveau) {
          errors.push(`Ligne ${rowNum}: niveau manquant`);
          continue;
        }
        if (!VALID_LEVELS.includes(niveau)) {
          errors.push(
            `Ligne ${rowNum}: niveau invalide "${niveau}" (attendu: CP, CE1, CE2, CM1, CM2)`
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
              level: niveau as SchoolLevel,
            },
          });

          createdUsers.push({ prenom, nom, identifiant: username, motDePasse: plainPassword, niveau });
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

// ---------- PUT /bulk-update - Bulk update users ----------
router.put(
  "/bulk-update",
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
