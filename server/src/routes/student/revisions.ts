import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";
import { recordAnswer, sanitizeQuestion } from "../../lib/quizEngine";

const router = Router();

router.use(authenticate);

function parseId(raw: unknown): number {
  return parseInt(Array.isArray(raw) ? (raw[0] as string) : (raw as string), 10);
}

/* ── GET / - Révisions ciblant le niveau de l'élève connecté ── */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.level) {
      res.json({ revisions: [] });
      return;
    }

    const now = new Date();
    const revisions = await prisma.revision.findMany({
      where: {
        targetLevel: user.level,
        // exclut les révisions dont la date de fin est passée
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } } },
    });

    // Meilleur score par révision (tentatives stampées revisionQuizId)
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, revisionQuizId: { in: revisions.map((r) => r.id) } },
      select: { revisionQuizId: true, score: true, totalQuestions: true },
    });
    const bestByRev = new Map<number, { score: number; totalQuestions: number }>();
    for (const a of attempts) {
      if (a.revisionQuizId == null) continue;
      const prev = bestByRev.get(a.revisionQuizId);
      if (!prev || a.score > prev.score) {
        bestByRev.set(a.revisionQuizId, { score: a.score, totalQuestions: a.totalQuestions });
      }
    }

    res.json({
      revisions: revisions.map((r) => {
        const best = bestByRev.get(r.id);
        return {
          id: r.id,
          name: r.name,
          description: r.description,
          totalQuestions: r._count.questions,
          endDate: r.endDate,
          bestScore: best?.score ?? null,
          completed: best ? best.score >= Math.ceil(best.totalQuestions * 0.7) : false,
        };
      }),
    });
  } catch (error) {
    console.error("Erreur student revisions GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── POST /:id/start - Démarrer une révision ── */
router.post("/:id/start", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const userId = req.user!.userId;

    const revision = await prisma.revision.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { question: { include: { answers: true } } },
        },
      },
    });

    if (!revision) {
      res.status(404).json({ error: "Révision introuvable" });
      return;
    }

    const questionRecords = revision.questions.map((rq) => rq.question);
    if (questionRecords.length === 0) {
      res.status(400).json({ error: "Cette révision ne contient aucune question" });
      return;
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        revisionQuizId: id,
        score: 0,
        totalQuestions: questionRecords.length,
      },
    });

    // Réponse calquée sur les quiz (champ `quiz` réutilisé pour QuizPlayPage)
    res.json({
      attemptId: attempt.id,
      quiz: { id: revision.id, title: revision.name, timeLimit: null },
      questions: questionRecords.map((q) => sanitizeQuestion(q)),
    });
  } catch (error) {
    console.error("Erreur lors du démarrage de la révision:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── POST /:id/answer - Soumettre une réponse ── */
router.post("/:id/answer", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const userId = req.user!.userId;
    const { attemptId, questionId, answer, usedHint } = req.body as {
      attemptId: number;
      questionId: number;
      answer: string;
      usedHint: boolean;
    };

    if (!attemptId || !questionId || answer === undefined || answer === null) {
      res.status(400).json({ error: "attemptId, questionId et answer sont requis" });
      return;
    }

    // L'attempt doit appartenir à l'élève ET à cette révision
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId, revisionQuizId: id },
    });
    if (!attempt) {
      res.status(404).json({ error: "Tentative introuvable" });
      return;
    }

    const question = await prisma.question.findFirst({
      where: { id: questionId },
      include: { answers: true },
    });
    if (!question) {
      res.status(404).json({ error: "Question introuvable" });
      return;
    }

    const { status, body } = await recordAnswer({ attemptId, question, answer, usedHint });
    res.status(status).json(body);
  } catch (error) {
    console.error("Erreur lors de la soumission de la réponse (révision):", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET /:id/results - Résultats d'une révision terminée ── */
router.get("/:id/results", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const attemptId = parseId(req.query.attemptId);

    if (isNaN(id) || isNaN(attemptId)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const userId = req.user!.userId;

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId, revisionQuizId: id },
      include: {
        revision: { select: { id: true, name: true } },
        questionAttempts: {
          include: { question: { include: { answers: true } } },
        },
      },
    });

    if (!attempt) {
      res.status(404).json({ error: "Tentative introuvable" });
      return;
    }

    const questions = attempt.questionAttempts.map((qa) => {
      const correctAnswers = qa.question.answers.filter((a) => a.isCorrect);
      return {
        id: qa.question.id,
        text: qa.question.text,
        type: qa.question.type,
        givenAnswer: qa.givenAnswer,
        isCorrect: qa.isCorrect,
        usedHint: qa.usedHint,
        attempts: qa.attempts,
        correctAnswer: correctAnswers.map((a) => a.text).join(", "),
      };
    });

    res.json({
      quiz: attempt.revision
        ? { id: attempt.revision.id, title: attempt.revision.name }
        : { id, title: "Révision" },
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      questions,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des résultats (révision):", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
