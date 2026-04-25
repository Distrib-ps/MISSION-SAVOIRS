import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

// ---------- GET / - Full content tree in one call ----------
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
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
