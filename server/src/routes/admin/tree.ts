import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

// ---------- GET / - Full content tree in one call ----------
// ?includeQuestions=true ajoute la liste des questions (id, text, type, order) sous chaque quiz.
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const includeQuestions = req.query.includeQuestions === "true";

    const themes = await prisma.theme.findMany({
      orderBy: { order: "asc" },
      include: {
        subThemes: {
          orderBy: { order: "asc" },
          include: {
            quizzes: {
              orderBy: { order: "asc" },
              include: {
                _count: { select: { questions: true } },
                ...(includeQuestions
                  ? {
                      questions: {
                        orderBy: { order: "asc" as const },
                        select: { id: true, text: true, type: true, order: true },
                      },
                    }
                  : {}),
              },
            },
            _count: { select: { quizzes: true } },
          },
        },
        _count: { select: { subThemes: true } },
      },
    });

    res.json({ themes });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'arborescence:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
