import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ---------- GET / - List quizzes for a given subtheme ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { subThemeId } = req.query;

    if (!subThemeId || typeof subThemeId !== "string") {
      res.status(400).json({ error: "Le paramètre subThemeId est requis" });
      return;
    }

    const parsedSubThemeId = parseInt(subThemeId, 10);

    if (isNaN(parsedSubThemeId)) {
      res.status(400).json({ error: "subThemeId invalide" });
      return;
    }

    const quizzes = await prisma.quiz.findMany({
      where: { subThemeId: parsedSubThemeId },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });

    res.json({ quizzes });
  } catch (error) {
    console.error("Erreur lors de la récupération des quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST / - Create a quiz ----------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, subThemeId } = req.body;

    if (!title) {
      res.status(400).json({ error: "Le champ title est requis" });
      return;
    }

    if (!subThemeId) {
      res.status(400).json({ error: "Le champ subThemeId est requis" });
      return;
    }

    // Verify subTheme exists
    const subTheme = await prisma.subTheme.findUnique({
      where: { id: subThemeId },
    });
    if (!subTheme) {
      res.status(404).json({ error: "Sous-thème introuvable" });
      return;
    }

    // Auto-set order to max + 1 within this subTheme
    const maxOrder = await prisma.quiz.aggregate({
      where: { subThemeId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description ?? null,
        subThemeId,
        order: nextOrder,
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    res.status(201).json({ quiz });
  } catch (error) {
    console.error("Erreur lors de la création du quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /reorder - Reorder quizzes (MUST be before /:id) ----------
router.put("/reorder", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "La liste des IDs est requise" });
      return;
    }

    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.quiz.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    res.json({ message: "Ordre des quiz mis à jour" });
  } catch (error) {
    console.error("Erreur lors du réordonnancement des quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /:id - Update a quiz ----------
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.quiz.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Quiz introuvable" });
      return;
    }

    const { title, description, order } = req.body;
    const data: Record<string, unknown> = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (order !== undefined) data.order = order;

    const quiz = await prisma.quiz.update({
      where: { id },
      data,
      include: {
        _count: { select: { questions: true } },
      },
    });

    res.json({ quiz });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- DELETE /:id - Delete a quiz (cascade) ----------
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.quiz.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Quiz introuvable" });
      return;
    }

    await prisma.quiz.delete({ where: { id } });

    res.json({ message: "Quiz supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
