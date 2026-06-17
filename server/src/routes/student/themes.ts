import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All student routes require authentication (no requireAdmin)
router.use(authenticate);

/**
 * Filtre d'accès d'un quiz pour un élève, combinant :
 *  1. Ciblage par classe (legacy) : quiz non ciblé = visible par tous ; ciblé =
 *     visible seulement par les classes visées (un élève sans classe ne voit que les non-ciblés).
 *  2. Visibilité : PUBLIC = tous les élèves ; PRIVATE = uniquement les élèves
 *     d'une classe dont le créateur du quiz est le professeur gestionnaire.
 */
function quizAccessWhere(classIds: number[]) {
  const classFilter =
    classIds.length === 0
      ? { classes: { none: {} } }
      : { OR: [{ classes: { none: {} } }, { classes: { some: { classId: { in: classIds } } } }] };

  const visibilityFilter = {
    OR: [
      { visibility: "PUBLIC" as const },
      ...(classIds.length > 0
        ? [
            {
              visibility: "PRIVATE" as const,
              creator: { managedClasses: { some: { id: { in: classIds } } } },
            },
          ]
        : []),
    ],
  };

  return { AND: [classFilter, visibilityFilter] };
}

async function getClassIds(userId: number): Promise<number[]> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { classes: { select: { id: true } } },
  });
  return u?.classes.map((c) => c.id) ?? [];
}

// ---------- GET / - List all themes (only those with content visible to the class) ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const classIds = await getClassIds(req.user!.userId);
    const themes = await prisma.theme.findMany({
      where: {
        subThemes: {
          some: {
            quizzes: {
              some: {
                questions: { some: {} },
                ...quizAccessWhere(classIds),
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

    const classIds = await getClassIds(req.user!.userId);
    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        subThemes: {
          where: {
            quizzes: {
              some: {
                questions: { some: {} },
                ...quizAccessWhere(classIds),
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
      const classIds = await getClassIds(userId);

      // Verify the sub-theme exists and belongs to the theme
      const subTheme = await prisma.subTheme.findFirst({
        where: { id: subThemeId, themeId },
      });

      if (!subTheme) {
        res.status(404).json({ error: "Sous-thème introuvable" });
        return;
      }

      // Fetch quizzes with question count (filtrés sur la classe de l'élève)
      const quizzes = await prisma.quiz.findMany({
        where: {
          subThemeId,
          questions: { some: {} },
          ...quizAccessWhere(classIds),
        },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { questions: true } },
        },
      });

      // Dernière tentative de chaque quiz : la plus récente fait foi
      // (un quiz raté en le rejouant repasse "non réussi").
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          userId,
          quizId: { in: quizzes.map((q) => q.id) },
          customPathId: null, // progression classique : ignore les tentatives jouées depuis un parcours
        },
        orderBy: [{ completedAt: "asc" }, { id: "asc" }],
        select: { quizId: true, score: true, id: true },
      });
      // ordre asc → la dernière valeur écrite est la tentative la plus récente
      const latestScoreMap = new Map<number, number>();
      const latestAttemptIdMap = new Map<number, number>();
      for (const a of attempts) {
        if (a.quizId !== null) {
          latestScoreMap.set(a.quizId, a.score);
          latestAttemptIdMap.set(a.quizId, a.id);
        }
      }

      // Dessins en attente de validation sur la dernière tentative de chaque quiz
      const latestAttemptIds = [...latestAttemptIdMap.values()];
      const pendingRows = latestAttemptIds.length
        ? await prisma.questionAttempt.findMany({
            where: { quizAttemptId: { in: latestAttemptIds }, validationStatus: "PENDING" },
            select: { quizAttemptId: true },
          })
        : [];
      const pendingAttemptIds = new Set(pendingRows.map((r) => r.quizAttemptId));
      const quizHasPending = (quizId: number) => {
        const aid = latestAttemptIdMap.get(quizId);
        return aid !== undefined && pendingAttemptIds.has(aid);
      };

      const isQuizCompleted = (quiz: { id: number; _count: { questions: number } }) => {
        const s = latestScoreMap.get(quiz.id);
        return s !== undefined && s >= Math.ceil(quiz._count.questions * 0.7);
      };

      // Compute status for each quiz with progressive unlocking (sur la dernière tentative)
      const quizzesWithStatus = quizzes.map((quiz, index) => {
        const latestScore = latestScoreMap.get(quiz.id);
        const completed = isQuizCompleted(quiz);

        let status: "completed" | "available" | "locked" | "pending";
        if (completed) {
          status = "completed";
        } else if (quizHasPending(quiz.id)) {
          status = "pending"; // l'élève a rendu un dessin en attente de validation
        } else if (index === 0) {
          status = "available";
        } else {
          status = isQuizCompleted(quizzes[index - 1]) ? "available" : "locked";
        }

        return {
          ...quiz,
          bestAttempt: latestScore !== undefined ? { score: latestScore } : null,
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
