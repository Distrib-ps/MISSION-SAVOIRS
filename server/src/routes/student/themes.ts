import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All student routes require authentication (no requireAdmin)
router.use(authenticate);

// ---------- GET / - List all themes (only those with content) ----------
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const themes = await prisma.theme.findMany({
      where: {
        subThemes: {
          some: {
            quizzes: {
              some: {
                questions: {
                  some: {},
                },
              },
            },
          },
        },
      },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { subThemes: true } },
      },
    });

    res.json(themes);
  } catch (error) {
    console.error("Erreur lors de la récupération des thèmes:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- GET /:id - Get a theme with its subThemes ----------
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        subThemes: {
          where: {
            quizzes: {
              some: {
                questions: {
                  some: {},
                },
              },
            },
          },
          orderBy: { order: "asc" },
          include: {
            _count: { select: { quizzes: true } },
          },
        },
      },
    });

    if (!theme) {
      res.status(404).json({ error: "Thème introuvable" });
      return;
    }

    res.json(theme);
  } catch (error) {
    console.error("Erreur lors de la récupération du thème:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- GET /:themeId/sub-themes/:subThemeId/quizzes ----------
router.get(
  "/:themeId/sub-themes/:subThemeId/quizzes",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rawThemeId = req.params.themeId;
      const rawSubThemeId = req.params.subThemeId;
      const themeId = parseInt(Array.isArray(rawThemeId) ? rawThemeId[0] : rawThemeId, 10);
      const subThemeId = parseInt(Array.isArray(rawSubThemeId) ? rawSubThemeId[0] : rawSubThemeId, 10);

      if (isNaN(themeId) || isNaN(subThemeId)) {
        res.status(400).json({ error: "ID invalide" });
        return;
      }

      const userId = req.user!.userId;

      // Verify the sub-theme exists and belongs to the theme
      const subTheme = await prisma.subTheme.findFirst({
        where: { id: subThemeId, themeId },
      });

      if (!subTheme) {
        res.status(404).json({ error: "Sous-thème introuvable" });
        return;
      }

      // Fetch quizzes with question count
      const quizzes = await prisma.quiz.findMany({
        where: {
          subThemeId,
          questions: { some: {} },
        },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { questions: true } },
        },
      });

      // Fetch the student's best attempt for each quiz in this sub-theme
      const bestAttempts = await prisma.quizAttempt.groupBy({
        by: ["quizId"],
        where: {
          userId,
          quizId: { in: quizzes.map((q) => q.id) },
        },
        _max: { score: true },
      });

      // Build a map of quizId -> best score
      const bestScoreMap = new Map<number, number>();
      for (const attempt of bestAttempts) {
        if (attempt._max.score !== null) {
          bestScoreMap.set(attempt.quizId, attempt._max.score);
        }
      }

      // Also fetch the full best attempt record for each quiz
      const bestAttemptRecords = await Promise.all(
        quizzes.map(async (quiz) => {
          const bestScore = bestScoreMap.get(quiz.id);
          if (bestScore === undefined) return { quizId: quiz.id, attempt: null };

          const attempt = await prisma.quizAttempt.findFirst({
            where: {
              userId,
              quizId: quiz.id,
              score: bestScore,
            },
            orderBy: { completedAt: "desc" },
          });

          return { quizId: quiz.id, attempt };
        })
      );

      const bestAttemptMap = new Map(
        bestAttemptRecords.map((r) => [r.quizId, r.attempt])
      );

      // Compute status for each quiz with progressive unlocking
      const quizzesWithStatus = quizzes.map((quiz, index) => {
        const totalQuestions = quiz._count.questions;
        const bestScore = bestScoreMap.get(quiz.id);
        const bestAttempt = bestAttemptMap.get(quiz.id) ?? null;

        const isCompleted =
          bestScore !== undefined && bestScore >= Math.ceil(totalQuestions * 0.7);

        let status: "completed" | "available" | "locked";

        if (isCompleted) {
          status = "completed";
        } else if (index === 0) {
          // First quiz is always available
          status = "available";
        } else {
          // Check if previous quiz is completed
          const prevQuiz = quizzes[index - 1];
          const prevBestScore = bestScoreMap.get(prevQuiz.id);
          const prevTotal = prevQuiz._count.questions;
          const prevCompleted =
            prevBestScore !== undefined &&
            prevBestScore >= Math.ceil(prevTotal * 0.7);

          status = prevCompleted ? "available" : "locked";
        }

        return {
          ...quiz,
          bestAttempt,
          status,
        };
      });

      res.json(quizzesWithStatus);
    } catch (error) {
      console.error("Erreur lors de la récupération des quizzes:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

export default router;
