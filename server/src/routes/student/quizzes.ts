import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All student quiz routes require authentication (no requireAdmin)
router.use(authenticate);

/**
 * Normalize a string for forgiving text comparison:
 * trim, lowercase, strip diacritics/accents.
 */
function normalizeText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Shuffle an array in place (Fisher-Yates) and return it.
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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

      // Verify the quiz exists and has questions
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
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

      if (quiz.questions.length === 0) {
        res.status(400).json({ error: "Ce quiz ne contient aucune question" });
        return;
      }

      // ── Réinjection: find failed questions from previous quizzes in the same sub-theme ──
      const failedQuestionAttempts = await prisma.questionAttempt.findMany({
        where: {
          quizAttempt: { userId },
          isCorrect: false,
          question: {
            quiz: { subThemeId: quiz.subThemeId },
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
            quizAttempt: { userId },
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
          score: 0,
          totalQuestions,
        },
      });

      // Build sanitized questions for the student
      const reinjectedIds = new Set(reinjectedQuestions.map((q) => q.id));
      const allQuestions = [...quiz.questions, ...reinjectedQuestions];
      const questions = allQuestions.map((q) => {
        const base: Record<string, unknown> = {
          id: q.id,
          text: q.text,
          type: q.type,
          order: q.order,
          hint: null,
          solution: null,
          isReinjected: reinjectedIds.has(q.id),
        };

        if (q.type === "QCM") {
          // Include answers WITHOUT isCorrect, shuffled
          base.answers = shuffle(
            q.answers.map((a) => ({
              id: a.id,
              text: a.text,
            }))
          );
          // Tell frontend how many correct answers there are (without revealing which)
          base.correctCount = q.answers.filter((a) => a.isCorrect).length;
        }
        // For TEXT questions: don't include answers at all

        return base;
      });

      res.json({
        attemptId: attempt.id,
        quiz: { id: quiz.id, title: quiz.title },
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

      // Check the answer
      let isCorrect = false;
      let correctAnswerText = "";
      let givenAnswerText = answer; // will be resolved to text for QCM

      if (question.type === "QCM") {
        // answer can be a single ID "5" or comma-separated IDs "5,8,12" for multi-select
        const selectedIds = String(answer)
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));

        if (selectedIds.length === 0) {
          res.status(400).json({ error: "ID de réponse invalide pour une question QCM" });
          return;
        }

        // Resolve IDs to text for storage
        const selectedAnswers = question.answers.filter((a) => selectedIds.includes(a.id));
        givenAnswerText = selectedAnswers.map((a) => a.text).join(", ");

        const correctAnswers = question.answers.filter((a) => a.isCorrect);
        const correctIds = new Set(correctAnswers.map((a) => a.id));

        // Correct if selected IDs match exactly the correct IDs
        const selectedSet = new Set(selectedIds);
        isCorrect =
          selectedSet.size === correctIds.size &&
          [...selectedSet].every((id) => correctIds.has(id));

        correctAnswerText = correctAnswers.map((a) => a.text).join(", ");
      } else {
        // TEXT: forgiving comparison
        const correct = question.answers.find((a) => a.isCorrect);
        if (correct) {
          correctAnswerText = correct.text;
          isCorrect =
            normalizeText(answer) === normalizeText(correct.text);
        }
      }

      // Check if the question was already attempted in this quiz attempt
      const existingAttempt = await prisma.questionAttempt.findFirst({
        where: { quizAttemptId: attemptId, questionId },
      });

      let questionAttemptCount: number;
      let wasAlreadyCorrect = false;

      if (existingAttempt) {
        wasAlreadyCorrect = existingAttempt.isCorrect;
        questionAttemptCount = existingAttempt.attempts + 1;

        // Update the existing QuestionAttempt
        await prisma.questionAttempt.update({
          where: { id: existingAttempt.id },
          data: {
            givenAnswer: givenAnswerText,
            isCorrect: existingAttempt.isCorrect || isCorrect,
            usedHint: existingAttempt.usedHint || usedHint || false,
            attempts: questionAttemptCount,
          },
        });
      } else {
        questionAttemptCount = 1;

        // Create a new QuestionAttempt
        await prisma.questionAttempt.create({
          data: {
            quizAttemptId: attemptId,
            questionId,
            givenAnswer: givenAnswerText,
            isCorrect,
            usedHint: usedHint || false,
            attempts: 1,
          },
        });
      }

      // If correct on first correct answer (not a retry that was already correct), increment score
      if (isCorrect && !wasAlreadyCorrect) {
        await prisma.quizAttempt.update({
          where: { id: attemptId },
          data: { score: { increment: 1 } },
        });
      }

      // Build the response based on hint/solution logic
      const response: Record<string, unknown> = {
        correct: isCorrect,
      };

      if (!isCorrect) {
        if (questionAttemptCount === 1) {
          // 1st wrong attempt: return hint (if exists)
          response.hint = question.hint || null;
        } else if (questionAttemptCount >= 2) {
          // 2nd+ wrong attempt: return solution (if exists) + correctAnswer
          response.solution = question.solution || null;
          response.correctAnswer = correctAnswerText;
        }
      }

      res.json(response);
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
