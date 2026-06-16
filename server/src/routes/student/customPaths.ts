import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

/* ── GET / - List the current user's custom paths with quiz progression ── */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const paths = await prisma.customPath.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        quizzes: {
          orderBy: { order: "asc" },
          include: {
            quiz: {
              include: { _count: { select: { questions: true } } },
            },
          },
        },
      },
    });

    /* Dernière tentative par quiz, isolée par parcours (Option B) — la plus récente fait foi */
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        customPathId: { in: paths.map((p) => p.id) },
      },
      orderBy: [{ completedAt: "asc" }, { id: "asc" }],
      select: { quizId: true, customPathId: true, score: true, totalQuestions: true },
    });
    // key = `${customPathId}:${quizId}` ; ordre asc → la dernière écriture = tentative la plus récente
    const bestByPathQuiz = new Map<string, { score: number; totalQuestions: number }>();
    for (const a of attempts) {
      if (a.quizId == null) continue; // tentatives de révision ignorées ici
      bestByPathQuiz.set(`${a.customPathId}:${a.quizId}`, { score: a.score, totalQuestions: a.totalQuestions });
    }

    const result = paths.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      quizzes: p.quizzes.map((cpq) => {
        const best = bestByPathQuiz.get(`${p.id}:${cpq.quizId}`);
        return {
          id: cpq.quiz.id,
          title: cpq.quiz.title,
          description: cpq.quiz.description,
          order: cpq.order,
          totalQuestions: cpq.quiz._count.questions,
          bestScore: best?.score ?? null,
          completed: best ? best.score >= Math.ceil(best.totalQuestions * 0.7) : false,
        };
      }),
    }));

    res.json({ paths: result });
  } catch (error) {
    console.error("Erreur student custom-paths GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET /:id - Get a single path with its quizzes ── */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const path = await prisma.customPath.findFirst({
      where: { id, userId },
      include: {
        quizzes: {
          orderBy: { order: "asc" },
          include: {
            quiz: {
              include: { _count: { select: { questions: true } } },
            },
          },
        },
      },
    });

    if (!path) {
      res.status(404).json({ error: "Parcours introuvable" });
      return;
    }

    // Dernière tentative isolée à CE parcours (Option B) — la plus récente fait foi
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, customPathId: path.id },
      orderBy: [{ completedAt: "asc" }, { id: "asc" }],
      select: { quizId: true, score: true, totalQuestions: true },
    });
    const bestByQuiz = new Map<number, { score: number; totalQuestions: number }>();
    for (const a of attempts) {
      if (a.quizId == null) continue; // tentatives de révision ignorées ici
      bestByQuiz.set(a.quizId, { score: a.score, totalQuestions: a.totalQuestions });
    }

    res.json({
      path: {
        id: path.id,
        name: path.name,
        description: path.description,
        quizzes: path.quizzes.map((cpq) => {
          const best = bestByQuiz.get(cpq.quizId);
          return {
            id: cpq.quiz.id,
            title: cpq.quiz.title,
            description: cpq.quiz.description,
            order: cpq.order,
            totalQuestions: cpq.quiz._count.questions,
            bestScore: best?.score ?? null,
            completed: best ? best.score >= Math.ceil(best.totalQuestions * 0.7) : false,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Erreur student custom-paths GET /:id:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
