import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { currentUserId } from "../../lib/ownership";

const router = Router();
router.use(authenticate, requireStaff);

/* ── GET / - Quiz partagés avec le prof courant (co-accès lecture) ── */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const me = currentUserId(req);
    const shares = await prisma.quizShare.findMany({
      where: { teacherId: me },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            createdById: true,
            _count: { select: { questions: true } },
            subTheme: {
              select: { name: true, theme: { select: { name: true, emoji: true } } },
            },
            creator: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    res.json({
      quizzes: shares.map((s) => ({
        id: s.quiz.id,
        title: s.quiz.title,
        description: s.quiz.description,
        totalQuestions: s.quiz._count.questions,
        theme: s.quiz.subTheme?.theme?.name ?? "—",
        emoji: s.quiz.subTheme?.theme?.emoji ?? "",
        subTheme: s.quiz.subTheme?.name ?? "—",
        owner: s.quiz.creator ? `${s.quiz.creator.firstName} ${s.quiz.creator.lastName}` : "—",
      })),
    });
  } catch (error) {
    console.error("Erreur shared-quizzes GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET /:id - Détail lecture seule d'un quiz partagé ── */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const me = currentUserId(req);
    const share = await prisma.quizShare.findUnique({
      where: { quizId_teacherId: { quizId: id, teacherId: me } },
    });
    if (!share) {
      res.status(403).json({ error: "Ce quiz ne vous est pas partagé" });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        subTheme: { select: { name: true, theme: { select: { name: true, emoji: true } } } },
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            text: true,
            type: true,
            hint: true,
            solution: true,
            answers: { select: { id: true, text: true, isCorrect: true, zone: true, order: true } },
          },
        },
      },
    });
    if (!quiz) {
      res.status(404).json({ error: "Quiz introuvable" });
      return;
    }
    res.json({ quiz });
  } catch (error) {
    console.error("Erreur shared-quizzes GET /:id:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
