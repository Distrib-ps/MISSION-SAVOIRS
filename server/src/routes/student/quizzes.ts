import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";
import { recordAnswer, sanitizeQuestion } from "../../lib/quizEngine";

const router = Router();

// All student quiz routes require authentication (no requireAdmin)
router.use(authenticate);

// ---------- POST /:id/start - Start a quiz attempt ----------
router.post(
  "/:id/start",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

      if (isNaN(id)) {
        res.status(400).json({ error: "ID invalide" });
        return;
      }

      const userId = req.user!.userId;

      // Optional: the custom path this quiz is being played from (Option B: isolated progression)
      const rawPathId = (req.body as { pathId?: unknown })?.pathId;
      let customPathId: number | null = null;
      if (rawPathId !== undefined && rawPathId !== null) {
        const parsed = parseInt(String(rawPathId), 10);
        if (isNaN(parsed)) {
          res.status(400).json({ error: "pathId invalide" });
          return;
        }
        // Verify the path belongs to the user and contains this quiz
        const path = await prisma.customPath.findFirst({
          where: {
            id: parsed,
            userId,
            quizzes: { some: { quizId: id } },
          },
        });
        if (!path) {
          res.status(404).json({ error: "Parcours introuvable ou ne contient pas ce quiz" });
          return;
        }
        customPathId = parsed;
      }

      // Classes de l'élève (pour le contrôle d'accès au quiz ciblé)
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { classes: { select: { id: true } } },
      });
      const classIds = student?.classes.map((c) => c.id) ?? [];

      // Verify the quiz exists and has questions
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          classes: { select: { classId: true } },
          questions: {
            orderBy: { order: "asc" },
            include: {
              answers: true,
            },
          },
        },
      });

      if (!quiz) {
        res.status(404).json({ error: "Quiz introuvable" });
        return;
      }

      // Contrôle d'accès classe : un quiz ciblé n'est jouable que par les classes visées
      const targetClassIds = new Set(quiz.classes.map((c) => c.classId));
      if (targetClassIds.size > 0 && !classIds.some((id) => targetClassIds.has(id))) {
        res.status(403).json({ error: "Ce quiz n'est pas accessible à votre classe" });
        return;
      }

      if (quiz.questions.length === 0) {
        res.status(400).json({ error: "Ce quiz ne contient aucune question" });
        return;
      }

      // Filtre de visibilité (réinjection : ne pas rejouer des questions d'un quiz d'une autre classe)
      const quizClassFilter =
        classIds.length === 0
          ? { classes: { none: {} } }
          : { OR: [{ classes: { none: {} } }, { classes: { some: { classId: { in: classIds } } } }] };

      // ── Réinjection: find failed questions from previous quizzes in the same sub-theme ──
      const failedQuestionAttempts = await prisma.questionAttempt.findMany({
        where: {
          // Réinjection scopée au contexte : un parcours ne rejoue que ses propres ratés
          quizAttempt: { userId, customPathId },
          isCorrect: false,
          question: {
            quiz: { subThemeId: quiz.subThemeId, ...quizClassFilter },
            quizId: { not: id }, // not from this quiz
          },
        },
        include: {
          question: {
            include: { answers: true },
          },
        },
        distinct: ["questionId"],
      });

      // Filter out questions that were eventually answered correctly in a later attempt
      const reinjectedQuestions = [];
      for (const fa of failedQuestionAttempts) {
        const laterCorrect = await prisma.questionAttempt.findFirst({
          where: {
            quizAttempt: { userId, customPathId },
            questionId: fa.questionId,
            isCorrect: true,
          },
        });
        if (!laterCorrect) {
          reinjectedQuestions.push(fa.question);
        }
      }

      const totalQuestions = quiz.questions.length + reinjectedQuestions.length;

      // Create a new QuizAttempt
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId,
          quizId: id,
          customPathId,
          score: 0,
          totalQuestions,
        },
      });

      // Build sanitized questions for the student (shared engine)
      const reinjectedIds = new Set(reinjectedQuestions.map((q) => q.id));
      const allQuestions = [...quiz.questions, ...reinjectedQuestions];
      const questions = allQuestions.map((q) =>
        sanitizeQuestion(q, { isReinjected: reinjectedIds.has(q.id) })
      );

      res.json({
        attemptId: attempt.id,
        quiz: { id: quiz.id, title: quiz.title, timeLimit: quiz.timeLimit },
        questions,
      });
    } catch (error) {
      console.error("Erreur lors du démarrage du quiz:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

// ---------- POST /:id/answer - Submit an answer ----------
router.post(
  "/:id/answer",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const quizId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

      if (isNaN(quizId)) {
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
        res
          .status(400)
          .json({ error: "attemptId, questionId et answer sont requis" });
        return;
      }

      // Verify the attempt belongs to the current user and is for this quiz
      const attempt = await prisma.quizAttempt.findFirst({
        where: { id: attemptId, userId, quizId },
      });

      if (!attempt) {
        res.status(404).json({ error: "Tentative introuvable" });
        return;
      }

      // Fetch the question with answers (no quizId filter: question may be reinjected from another quiz)
      const question = await prisma.question.findFirst({
        where: { id: questionId },
        include: { answers: true },
      });

      if (!question) {
        res.status(404).json({ error: "Question introuvable" });
        return;
      }

      // Correction + enregistrement + logique indice/solution (moteur partagé)
      const { status, body } = await recordAnswer({
        attemptId,
        question,
        answer,
        usedHint,
      });
      res.status(status).json(body);
    } catch (error) {
      console.error("Erreur lors de la soumission de la réponse:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

// ---------- GET /:id/results - Get results for a completed quiz ----------
router.get(
  "/:id/results",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const quizId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
      const rawAttemptId = req.query.attemptId;
      const attemptId = parseInt(
        Array.isArray(rawAttemptId) ? rawAttemptId[0] as string : rawAttemptId as string,
        10
      );

      if (isNaN(quizId) || isNaN(attemptId)) {
        res.status(400).json({ error: "ID invalide" });
        return;
      }

      const userId = req.user!.userId;

      // Verify the attempt belongs to the current user and is for this quiz
      const attempt = await prisma.quizAttempt.findFirst({
        where: { id: attemptId, userId, quizId },
        include: {
          quiz: {
            select: { id: true, title: true },
          },
          questionAttempts: {
            include: {
              question: {
                include: { answers: true },
              },
            },
          },
        },
      });

      if (!attempt) {
        res.status(404).json({ error: "Tentative introuvable" });
        return;
      }

      // Build the questions results with correct answers revealed
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
          validationStatus: qa.validationStatus,
          correctAnswer: correctAnswers.map((a) => a.text).join(", "),
        };
      });

      res.json({
        quiz: attempt.quiz,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        questions,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des résultats:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

export default router;
