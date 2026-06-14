import { Router, Request, Response } from "express";
import { SchoolLevel } from "@prisma/client";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

// Inclusion commune : questions ordonnées avec fil d'ariane (thème > sous-thème > quiz)
const questionInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: {
      question: {
        select: {
          id: true,
          text: true,
          type: true,
          quiz: {
            select: {
              id: true,
              title: true,
              subTheme: {
                select: {
                  id: true,
                  name: true,
                  theme: { select: { id: true, name: true, emoji: true } },
                },
              },
            },
          },
        },
      },
    },
  },
};

/* ── GET /?level=CM1 - Liste des révisions (filtre niveau optionnel) ── */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { level } = req.query;
    const where: { targetLevel?: SchoolLevel } = {};
    if (typeof level === "string" && LEVELS.includes(level as SchoolLevel)) {
      where.targetLevel = level as SchoolLevel;
    }

    const revisions = await prisma.revision.findMany({
      where,
      orderBy: [{ targetLevel: "asc" }, { createdAt: "desc" }],
      include: questionInclude,
    });

    res.json({ revisions });
  } catch (error) {
    console.error("Erreur revisions GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── POST / - Créer une révision ── */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, targetLevel, endDate, questionIds } = req.body as {
      name: string;
      description?: string | null;
      targetLevel: SchoolLevel;
      endDate?: string | null;
      questionIds: number[];
    };

    if (!name || !targetLevel) {
      res.status(400).json({ error: "name et targetLevel sont requis" });
      return;
    }
    if (!LEVELS.includes(targetLevel)) {
      res.status(400).json({ error: "targetLevel invalide" });
      return;
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      res.status(400).json({ error: "Au moins une question est requise" });
      return;
    }

    const revision = await prisma.revision.create({
      data: {
        name,
        description: description ?? null,
        targetLevel,
        endDate: endDate ? new Date(endDate) : null,
        questions: {
          create: questionIds.map((questionId, index) => ({
            questionId,
            order: index,
          })),
        },
      },
      include: questionInclude,
    });

    res.status(201).json({ revision });
  } catch (error) {
    console.error("Erreur revisions POST:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── PUT /:id - Modifier une révision ── */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.revision.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Révision introuvable" });
      return;
    }

    const { name, description, targetLevel, endDate, questionIds } = req.body as {
      name?: string;
      description?: string | null;
      targetLevel?: SchoolLevel;
      endDate?: string | null;
      questionIds?: number[];
    };

    if (targetLevel !== undefined && !LEVELS.includes(targetLevel)) {
      res.status(400).json({ error: "targetLevel invalide" });
      return;
    }

    const revision = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (targetLevel !== undefined) data.targetLevel = targetLevel;
      if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

      if (questionIds !== undefined) {
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
          throw new Error("Au moins une question est requise");
        }
        await tx.revisionQuestion.deleteMany({ where: { revisionId: id } });
        await tx.revisionQuestion.createMany({
          data: questionIds.map((questionId, index) => ({
            revisionId: id,
            questionId,
            order: index,
          })),
        });
      }

      return tx.revision.update({ where: { id }, data, include: questionInclude });
    });

    res.json({ revision });
  } catch (error) {
    console.error("Erreur revisions PUT:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Erreur interne du serveur" });
  }
});

/* ── DELETE /:id ── */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.revision.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Révision introuvable" });
      return;
    }

    await prisma.revision.delete({ where: { id } });
    res.json({ message: "Révision supprimée avec succès" });
  } catch (error) {
    console.error("Erreur revisions DELETE:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
