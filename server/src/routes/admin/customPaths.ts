import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

/* ── GET /?userId=X - List custom paths for a user ── */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "Le paramètre userId est requis" });
      return;
    }
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      res.status(400).json({ error: "userId invalide" });
      return;
    }

    const paths = await prisma.customPath.findMany({
      where: { userId: parsedUserId },
      orderBy: { createdAt: "asc" },
      include: {
        quizzes: {
          orderBy: { order: "asc" },
          include: {
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
                _count: { select: { questions: true } },
              },
            },
          },
        },
      },
    });

    res.json({ paths });
  } catch (error) {
    console.error("Erreur custom-paths GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── POST / - Create a custom path ── */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, description, quizIds } = req.body as {
      userId: number;
      name: string;
      description?: string | null;
      quizIds: number[];
    };

    if (!userId || !name) {
      res.status(400).json({ error: "userId et name sont requis" });
      return;
    }
    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      res.status(400).json({ error: "Au moins un quiz est requis" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    const path = await prisma.customPath.create({
      data: {
        name,
        description: description ?? null,
        userId,
        quizzes: {
          create: quizIds.map((quizId, index) => ({
            quizId,
            order: index,
          })),
        },
      },
      include: {
        quizzes: { orderBy: { order: "asc" }, include: { quiz: true } },
      },
    });

    res.status(201).json({ path });
  } catch (error) {
    console.error("Erreur custom-paths POST:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── PUT /:id - Update a custom path ── */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.customPath.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Parcours introuvable" });
      return;
    }

    const { name, description, quizIds } = req.body as {
      name?: string;
      description?: string | null;
      quizIds?: number[];
    };

    const path = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;

      /* Replace quizzes if provided */
      if (quizIds !== undefined) {
        if (!Array.isArray(quizIds) || quizIds.length === 0) {
          throw new Error("Au moins un quiz est requis");
        }
        await tx.customPathQuiz.deleteMany({ where: { customPathId: id } });
        await tx.customPathQuiz.createMany({
          data: quizIds.map((quizId, index) => ({
            customPathId: id,
            quizId,
            order: index,
          })),
        });
      }

      return tx.customPath.update({
        where: { id },
        data,
        include: {
          quizzes: { orderBy: { order: "asc" }, include: { quiz: true } },
        },
      });
    });

    res.json({ path });
  } catch (error) {
    console.error("Erreur custom-paths PUT:", error);
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

    const existing = await prisma.customPath.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Parcours introuvable" });
      return;
    }

    await prisma.customPath.delete({ where: { id } });
    res.json({ message: "Parcours supprimé avec succès" });
  } catch (error) {
    console.error("Erreur custom-paths DELETE:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
