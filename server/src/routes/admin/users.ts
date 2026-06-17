import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin, requireStaff } from "../../middleware/auth";
import { isOwner, currentUserId } from "../../lib/ownership";
import { logAudit } from "../../lib/audit";
import { SchoolLevel } from "@prisma/client";

const router = Router();

// Multer config: memory storage (buffer, no disk), plafonné + type restreint
const ALLOWED_IMPORT_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain", // certains navigateurs envoient les .csv ainsi
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 Mo max
  fileFilter: (_req, file, cb) => {
    const okExt = /\.(xlsx|csv)$/i.test(file.originalname);
    if (ALLOWED_IMPORT_MIME.has(file.mimetype) && okExt) cb(null, true);
    else cb(new Error("Type de fichier non autorisé (.xlsx ou .csv attendu)"));
  },
});

// All routes require authentication + admin role
router.use(authenticate, requireStaff);

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
  classes: { select: { id: true, name: true, level: true } },
  createdAt: true,
  updatedAt: true,
};

/** Vérifie que toutes les classes fournies existent ; renvoie les ids valides. */
async function validClassIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const found = await prisma.class.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return found.map((c) => c.id);
}

// ---------- GET / - List all users (students AND admins) ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, role, search, classId } = req.query;

    const where: Record<string, unknown> = {};

    // Un prof voit TOUS les élèves (pas seulement ceux de ses classes) afin
    // d'éviter, en cas de multi-classe, de recréer un compte déjà existant.
    // Il ne voit en revanche pas les comptes admin/prof.
    if (!isOwner(req)) {
      where.role = "STUDENT";
    }

    // Filtre par classe demandé explicitement
    if (classId && typeof classId === "string") {
      const cid = parseInt(classId, 10);
      if (!isNaN(cid)) where.classes = { some: { id: cid } };
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
    const { firstName, lastName, level, password, role, classIds } = req.body as {
      firstName?: string;
      lastName?: string;
      level?: string;
      password?: string;
      role?: string;
      classIds?: number[];
    };

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

    // Classes/groupes (multi-appartenance, optionnel)
    const requestedClassIds = Array.isArray(classIds)
      ? classIds.map((c) => Number(c)).filter((n) => !isNaN(n))
      : [];
    const resolvedClassIds = await validClassIds(requestedClassIds);
    const resolvedLevel: SchoolLevel | null = level ? (level.toUpperCase() as SchoolLevel) : null;

    // Un prof doit rattacher l'élève à au moins une classe/groupe (sans restriction de propriété)
    if (!isOwner(req) && resolvedClassIds.length === 0) {
      res.status(400).json({ error: "Un professeur doit rattacher l'élève à au moins une classe ou un groupe" });
      return;
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

    // Pour un élève, le niveau est requis (attribut propre, décorrélé des classes)
    if (userRole === "STUDENT" && !resolvedLevel) {
      res.status(400).json({ error: "Le niveau scolaire est requis pour les élèves" });
      return;
    }

    const username = await generateUsername(firstName, lastName);
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: userRole as "ADMIN" | "STUDENT" | "TEACHER",
        level: resolvedLevel,
        ...(resolvedClassIds.length > 0
          ? { classes: { connect: resolvedClassIds.map((id) => ({ id })) } }
          : {}),
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

    // Un prof peut éditer n'importe quel élève (pool partagé) mais pas un compte admin/prof.
    if (!isOwner(req) && existingUser.role !== "STUDENT") {
      res.status(403).json({ error: "Seul le propriétaire peut modifier un compte professeur/admin" });
      return;
    }

    const { firstName, lastName, level, password, role, classIds } = req.body as {
      firstName?: string;
      lastName?: string;
      level?: string | null;
      password?: string;
      role?: string;
      classIds?: number[];
    };

    const data: Record<string, unknown> = {};

    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;

    // Classes/groupes : remplace l'ensemble des appartenances si fourni
    if (classIds !== undefined) {
      const ids = Array.isArray(classIds)
        ? classIds.map((c) => Number(c)).filter((n) => !isNaN(n))
        : [];
      const valid = await validClassIds(ids);
      data.classes = { set: valid.map((cid) => ({ id: cid })) };
    }

    if (role !== undefined) {
      const upperRole = role.toUpperCase();
      if (upperRole !== "ADMIN" && upperRole !== "STUDENT") {
        res.status(400).json({ error: "Rôle invalide. Utilisez ADMIN ou STUDENT" });
        return;
      }
      if (upperRole !== "STUDENT" && !isOwner(req)) {
        res.status(403).json({ error: "Seul le propriétaire peut attribuer un rôle professeur/admin" });
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
      data.password = await bcrypt.hash(password, 12);
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

    // Un prof peut supprimer n'importe quel élève (pool partagé) mais pas un compte admin/prof.
    if (!isOwner(req) && existingUser.role !== "STUDENT") {
      res.status(403).json({ error: "Seul le propriétaire peut supprimer un compte professeur/admin" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    logAudit(req, "USER_DELETE", {
      targetType: "USER",
      targetId: id,
      detail: `${existingUser.role} ${existingUser.username}`,
    });

    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Encapsule multer pour renvoyer un 400 explicite (type/taille invalide) au lieu d'un 500.
function importUpload(req: Request, res: Response, next: () => void): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Fichier invalide";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

// ---------- POST /import - Bulk import students from Excel/CSV (Owner uniquement) ----------
router.post(
  "/import",
  requireAdmin,
  importUpload,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier fourni" });
        return;
      }

      // Parse le fichier (xlsx ou csv) avec exceljs, en reconstruisant des lignes
      // { ENTÊTE: valeur } pour conserver la suite du traitement inchangée.
      const isCsv =
        /\.csv$/i.test(req.file.originalname) || req.file.mimetype.includes("csv");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- conflit de types Buffer entre @types/node et exceljs
      const buf: any = Buffer.from(req.file.buffer);
      const workbook = new ExcelJS.Workbook();
      let worksheet: ExcelJS.Worksheet | undefined;
      if (isCsv) {
        worksheet = await workbook.csv.read(Readable.from(buf));
      } else {
        await workbook.xlsx.load(buf);
        worksheet = workbook.worksheets[0];
      }
      if (!worksheet) {
        res.status(400).json({ error: "Le fichier ne contient aucune feuille" });
        return;
      }

      const cellText = (v: ExcelJS.CellValue): string => {
        if (v === null || v === undefined) return "";
        if (typeof v === "object") {
          // RichText / formule / hyperlink
          const o = v as { text?: string; result?: unknown };
          if (typeof o.text === "string") return o.text;
          if (o.result !== undefined) return String(o.result);
          return "";
        }
        return String(v);
      };

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, col) => {
        headers[col] = cellText(cell.value).trim();
      });

      const rows: Record<string, unknown>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // ligne d'entêtes
        const obj: Record<string, unknown> = {};
        let hasValue = false;
        row.eachCell((cell, col) => {
          const key = headers[col];
          if (!key) return;
          const text = cellText(cell.value);
          if (text !== "") hasValue = true;
          obj[key] = text;
        });
        if (hasValue) rows.push(obj);
      });

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

        // Classe(s) (optionnel) : rattachement par nom, plusieurs séparés par ; ou ,
        // (le niveau vient toujours de la colonne NIVEAU)
        const classConnectIds: number[] = [];
        if (classeName) {
          const names = classeName
            .split(/[;,]/)
            .map((n) => n.trim())
            .filter(Boolean);
          const notFound: string[] = [];
          for (const n of names) {
            const cls = classByName.get(n.toLowerCase());
            if (!cls) notFound.push(n);
            else if (!classConnectIds.includes(cls.id)) classConnectIds.push(cls.id);
          }
          if (notFound.length > 0) {
            errors.push(`Ligne ${rowNum}: classe(s) introuvable(s) : ${notFound.join(", ")}`);
            continue;
          }
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
          const hashedPassword = await bcrypt.hash(plainPassword, 12);

          await prisma.user.create({
            data: {
              username,
              password: hashedPassword,
              firstName: prenom,
              lastName: nom,
              role: "STUDENT",
              level: niveau as SchoolLevel,
              ...(classConnectIds.length > 0
                ? { classes: { connect: classConnectIds.map((id) => ({ id })) } }
                : {}),
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

      logAudit(req, "USERS_IMPORT", { detail: `${created} élève(s) importé(s)` });
      // Réponse contenant des mots de passe en clair : ne jamais mettre en cache.
      res.set("Cache-Control", "no-store");
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
      logAudit(req, "USER_BULK_DELETE", { detail: `${result.count} compte(s) supprimé(s)` });

      res.json({ deleted: result.count });
    } catch (error) {
      console.error("Erreur lors de la suppression en masse:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

// ---------- GET /:id/export - Export RGPD des données d'un élève (accès/portabilité) ----------
router.get("/:id/export", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        level: true,
        createdAt: true,
        classes: { select: { name: true, level: true } },
        quizAttempts: {
          select: {
            score: true,
            totalQuestions: true,
            completedAt: true,
            quiz: { select: { title: true } },
            questionAttempts: {
              select: {
                givenAnswer: true,
                isCorrect: true,
                usedHint: true,
                attempts: true,
                validationStatus: true,
                question: { select: { text: true, type: true } },
              },
            },
          },
        },
        customPaths: { select: { name: true, description: true, createdAt: true } },
      },
    });

    if (!student || student.role !== "STUDENT") {
      res.status(404).json({ error: "Élève introuvable" });
      return;
    }
    // Un prof ne peut exporter qu'un compte élève (pas un compte staff) — déjà filtré ci-dessus.

    logAudit(req, "STUDENT_EXPORT", { targetType: "USER", targetId: id });

    res.set("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="export_eleve_${id}.json"`
    );
    res.json({
      exporteLe: new Date().toISOString(),
      eleve: {
        identifiant: student.username,
        prenom: student.firstName,
        nom: student.lastName,
        niveau: student.level,
        compteCreeLe: student.createdAt,
        classes: student.classes,
      },
      resultats: student.quizAttempts,
      parcoursPersonnalises: student.customPaths,
    });
  } catch (error) {
    console.error("Erreur export élève:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- GET /audit/logs - Journal d'accès (Owner uniquement) ----------
router.get("/audit/logs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const take = Math.min(parseInt(String(req.query.take ?? "100"), 10) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { actor: { select: { firstName: true, lastName: true, username: true } } },
    });
    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        detail: l.detail,
        createdAt: l.createdAt,
        actor: l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : "—",
      })),
    });
  } catch (error) {
    console.error("Erreur audit logs:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
