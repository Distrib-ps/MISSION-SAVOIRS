import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET / - List all students, optional filter by level
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { level } = req.query;

    const where: Record<string, unknown> = { role: "STUDENT" };

    if (level && typeof level === "string") {
      const validLevels = ["CP", "CE1", "CE2", "CM1", "CM2"];
      if (!validLevels.includes(level)) {
        res.status(400).json({ error: "Niveau scolaire invalide" });
        return;
      }
      where.level = level;
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        level: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { firstName: "asc" },
    });

    res.json({ students });
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Helper: generate unique username as FirstNameL (first letter of lastName)
async function generateUsername(firstName: string, lastName: string): Promise<string> {
  const base =
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1).toLowerCase() +
    lastName.charAt(0).toUpperCase();

  // Check if the base username already exists
  const existing = await prisma.user.findUnique({ where: { username: base } });

  if (!existing) {
    return base;
  }

  // Append incrementing number starting at 2
  let counter = 2;
  while (true) {
    const candidate = `${base}${counter}`;
    const found = await prisma.user.findUnique({ where: { username: candidate } });
    if (!found) {
      return candidate;
    }
    counter++;
  }
}

// POST / - Create a student
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, level, password } = req.body;

    if (!firstName || !lastName || !level || !password) {
      res.status(400).json({ error: "Tous les champs sont requis: firstName, lastName, level, password" });
      return;
    }

    const validLevels = ["CP", "CE1", "CE2", "CM1", "CM2"];
    if (!validLevels.includes(level)) {
      res.status(400).json({ error: "Niveau scolaire invalide" });
      return;
    }

    const username = await generateUsername(firstName, lastName);
    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: "STUDENT",
        level,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        level: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ student });
  } catch (error) {
    console.error("Erreur lors de la création de l'élève:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// PUT /:id - Update a student
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
      res.status(404).json({ error: "Élève introuvable" });
      return;
    }

    if (existingUser.role !== "STUDENT") {
      res.status(400).json({ error: "Seuls les élèves peuvent être modifiés via cette route" });
      return;
    }

    const { firstName, lastName, level, password } = req.body;

    const data: Record<string, unknown> = {};

    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;

    if (level !== undefined) {
      const validLevels = ["CP", "CE1", "CE2", "CM1", "CM2"];
      if (!validLevels.includes(level)) {
        res.status(400).json({ error: "Niveau scolaire invalide" });
        return;
      }
      data.level = level;
    }

    if (password !== undefined) {
      data.password = await bcrypt.hash(password, 10);
    }

    // Regenerate username if firstName or lastName changed
    if (firstName !== undefined || lastName !== undefined) {
      const newFirstName = firstName ?? existingUser.firstName;
      const newLastName = lastName ?? existingUser.lastName;
      const newBase =
        newFirstName.charAt(0).toUpperCase() +
        newFirstName.slice(1).toLowerCase() +
        newLastName.charAt(0).toUpperCase();

      // Only regenerate if the base changed
      const oldBase =
        existingUser.firstName.charAt(0).toUpperCase() +
        existingUser.firstName.slice(1).toLowerCase() +
        existingUser.lastName.charAt(0).toUpperCase();

      if (newBase !== oldBase) {
        data.username = await generateUsername(newFirstName, newLastName);
      }
    }

    const student = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        level: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ student });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'élève:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// DELETE /:id - Delete a student
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      res.status(404).json({ error: "Élève introuvable" });
      return;
    }

    if (existingUser.role !== "STUDENT") {
      res.status(400).json({ error: "Seuls les élèves peuvent être supprimés via cette route" });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: "Élève supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'élève:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
