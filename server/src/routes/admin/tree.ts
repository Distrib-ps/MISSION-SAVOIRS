import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { contentOwnerWhere } from "../../lib/ownership";

const router = Router();

router.use(authenticate, requireStaff);

// ---------- GET / - Full content tree in one call ----------
// ?includeQuestions=true ajoute la liste des questions (id, text, type, order) sous chaque quiz.
// Cloisonnement : un prof ne voit que son propre arbre (filtré à chaque niveau).
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const includeQuestions = req.query.includeQuestions === "true";
    const ownerWhere = contentOwnerWhere(req);

    const themes = await prisma.theme.findMany({
      where: { ...ownerWhere },
      orderBy: { order: "asc" },
      include: {
        subThemes: {
          where: { ...ownerWhere },
          orderBy: { order: "asc" },
          include: {
            quizzes: {
              where: { ...ownerWhere },
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
