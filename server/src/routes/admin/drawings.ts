import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { isOwner, currentUserId } from "../../lib/ownership";

const router = Router();
router.use(authenticate, requireStaff);

// Filtre : dessins en attente sur les questions créées par le prof (Owner = toutes)
function pendingWhere(req: Request) {
  return {
    validationStatus: "PENDING" as const,
    question: {
      type: "DRAWING" as const,
      ...(isOwner(req) ? {} : { createdById: currentUserId(req) }),
    },
  };
}

/* ── GET /count - Nombre de dessins en attente (badge) ── */
router.get("/count", async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await prisma.questionAttempt.count({ where: pendingWhere(req) });
    res.json({ count });
  } catch (error) {
    console.error("Erreur drawings count:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET / - Liste des dessins en attente de validation ── */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.questionAttempt.findMany({
      where: pendingWhere(req),
      select: {
        id: true,
        givenAnswer: true, // base64 du dessin
        question: {
          select: { id: true, text: true, quiz: { select: { id: true, title: true } } },
        },
        quizAttempt: {
          select: { completedAt: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { id: "desc" },
    });

    res.json({
      drawings: items.map((it) => ({
        attemptId: it.id,
        image: it.givenAnswer,
        questionText: it.question.text,
        quizTitle: it.question.quiz?.title ?? "—",
        student: `${it.quizAttempt.user.firstName} ${it.quizAttempt.user.lastName}`,
        submittedAt: it.quizAttempt.completedAt,
      })),
    });
  } catch (error) {
    console.error("Erreur drawings GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── POST /:attemptId/validate { approve } - Valider / refuser un dessin ── */
router.post("/:attemptId/validate", async (req: Request, res: Response): Promise<void> => {
  try {
    const attemptId = parseInt(
      Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId,
      10
    );
    const { approve } = req.body as { approve?: boolean };
    if (isNaN(attemptId) || typeof approve !== "boolean") {
      res.status(400).json({ error: "attemptId et approve (booléen) requis" });
      return;
    }

    const qa = await prisma.questionAttempt.findUnique({
      where: { id: attemptId },
      include: { question: { select: { type: true, createdById: true } } },
    });
    if (!qa || qa.question.type !== "DRAWING") {
      res.status(404).json({ error: "Dessin introuvable" });
      return;
    }
    // Restreint au prof auteur de la question (ou Owner)
    if (!isOwner(req) && qa.question.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Vous n'êtes pas l'auteur de cette question" });
      return;
    }

    const wasApproved = qa.validationStatus === "APPROVED";

    await prisma.questionAttempt.update({
      where: { id: attemptId },
      data: {
        validationStatus: approve ? "APPROVED" : "REJECTED",
        isCorrect: approve,
      },
    });

    // Ajuste le score de la tentative (une seule fois)
    if (approve && !wasApproved) {
      await prisma.quizAttempt.update({
        where: { id: qa.quizAttemptId },
        data: { score: { increment: 1 } },
      });
    } else if (!approve && wasApproved) {
      await prisma.quizAttempt.update({
        where: { id: qa.quizAttemptId },
        data: { score: { decrement: 1 } },
      });
    }

    res.json({ message: approve ? "Dessin validé" : "Dessin refusé" });
  } catch (error) {
    console.error("Erreur drawings validate:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
