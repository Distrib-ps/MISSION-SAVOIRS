import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { QuestionType } from "@prisma/client";

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

const VALID_QUESTION_TYPES: string[] = ["QCM", "TEXT", "DRAG_DROP"];

// ---------- GET / - List questions for a given quiz with answers ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.query;

    if (!quizId || typeof quizId !== "string") {
      res.status(400).json({ error: "Le paramètre quizId est requis" });
      return;
    }

    const parsedQuizId = parseInt(quizId, 10);

    if (isNaN(parsedQuizId)) {
      res.status(400).json({ error: "quizId invalide" });
      return;
    }

    const questions = await prisma.question.findMany({
      where: { quizId: parsedQuizId },
      orderBy: { order: "asc" },
      include: {
        answers: true,
      },
    });

    res.json({ questions });
  } catch (error) {
    console.error("Erreur lors de la récupération des questions:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST / - Create a question with answers ----------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, type, hint, solution, quizId, answers } = req.body;

    if (!text) {
      res.status(400).json({ error: "Le champ text est requis" });
      return;
    }

    if (!type) {
      res.status(400).json({ error: "Le champ type est requis" });
      return;
    }

    if (!VALID_QUESTION_TYPES.includes(type)) {
      res
        .status(400)
        .json({ error: "Type invalide. Utilisez QCM, TEXT ou DRAG_DROP" });
      return;
    }

    if (!quizId) {
      res.status(400).json({ error: "Le champ quizId est requis" });
      return;
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      res
        .status(400)
        .json({ error: "Au moins une réponse est requise" });
      return;
    }

    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      res.status(404).json({ error: "Quiz introuvable" });
      return;
    }

    // Auto-set order to max + 1 within this quiz
    const maxOrder = await prisma.question.aggregate({
      where: { quizId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const question = await prisma.question.create({
      data: {
        text,
        type: type as QuestionType,
        hint: hint ?? null,
        solution: solution ?? null,
        quizId,
        order: nextOrder,
        answers: {
          create: answers.map(
            (a: { text: string; isCorrect?: boolean; zone?: string | null }) => ({
              text: a.text,
              isCorrect: a.isCorrect ?? false,
              zone: a.zone ?? null,
            })
          ),
        },
      },
      include: {
        answers: true,
      },
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error("Erreur lors de la création de la question:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /reorder - Reorder questions (MUST be before /:id) ----------
router.put("/reorder", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "La liste des IDs est requise" });
      return;
    }

    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.question.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    res.json({ message: "Ordre des questions mis à jour" });
  } catch (error) {
    console.error(
      "Erreur lors du réordonnancement des questions:",
      error
    );
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /:id - Update a question (optionally replace answers) ----------
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.question.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Question introuvable" });
      return;
    }

    const { text, type, hint, solution, answers } = req.body;

    if (type !== undefined && !VALID_QUESTION_TYPES.includes(type)) {
      res
        .status(400)
        .json({ error: "Type invalide. Utilisez QCM, TEXT ou DRAG_DROP" });
      return;
    }

    // If answers are provided, delete existing and create new ones in a transaction
    if (answers !== undefined) {
      if (!Array.isArray(answers) || answers.length === 0) {
        res
          .status(400)
          .json({ error: "Au moins une réponse est requise" });
        return;
      }

      const data: Record<string, unknown> = {};
      if (text !== undefined) data.text = text;
      if (type !== undefined) data.type = type as QuestionType;
      if (hint !== undefined) data.hint = hint;
      if (solution !== undefined) data.solution = solution;

      const question = await prisma.$transaction(async (tx) => {
        // Delete all existing answers
        await tx.answer.deleteMany({ where: { questionId: id } });

        // Update question and create new answers
        return tx.question.update({
          where: { id },
          data: {
            ...data,
            answers: {
              create: answers.map(
                (a: { text: string; isCorrect?: boolean; zone?: string | null }) => ({
                  text: a.text,
                  isCorrect: a.isCorrect ?? false,
                  zone: a.zone ?? null,
                })
              ),
            },
          },
          include: {
            answers: true,
          },
        });
      });

      res.json({ question });
    } else {
      // Update question fields only (no answer changes)
      const data: Record<string, unknown> = {};
      if (text !== undefined) data.text = text;
      if (type !== undefined) data.type = type as QuestionType;
      if (hint !== undefined) data.hint = hint;
      if (solution !== undefined) data.solution = solution;

      const question = await prisma.question.update({
        where: { id },
        data,
        include: {
          answers: true,
        },
      });

      res.json({ question });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la question:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- DELETE /:id - Delete a question (cascade) ----------
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.question.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Question introuvable" });
      return;
    }

    await prisma.question.delete({ where: { id } });

    res.json({ message: "Question supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la question:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
