import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { isOwner, currentUserId } from "../../lib/ownership";

const router = Router();

router.use(authenticate, requireStaff);

// ---------- GET / - Full content tree in one call ----------
// ?includeQuestions=true ajoute la liste des questions (id, text, type, order) sous chaque quiz.
// ?includePublic=true inclut aussi, en plus du contenu du prof, les quiz PUBLICS des autres
//   (lecture seule, ex. pour piocher des questions dans une révision).
// Sinon : un prof ne voit que son propre arbre (filtré à chaque niveau).
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const includeQuestions = req.query.includeQuestions === "true";
    const includePublic = req.query.includePublic === "true";
    const owner = isOwner(req);
    const uid = currentUserId(req);

    // where par niveau : contenu propre, + (si includePublic) chemins menant à un quiz public
    const themeWhere = owner
      ? {}
      : includePublic
        ? { OR: [{ createdById: uid }, { subThemes: { some: { quizzes: { some: { visibility: "PUBLIC" as const } } } } }] }
        : { createdById: uid };
    const subThemeWhere = owner
      ? {}
      : includePublic
        ? { OR: [{ createdById: uid }, { quizzes: { some: { visibility: "PUBLIC" as const } } }] }
        : { createdById: uid };
    const quizWhere = owner
      ? {}
      : includePublic
        ? { OR: [{ createdById: uid }, { visibility: "PUBLIC" as const }] }
        : { createdById: uid };

    const themes = await prisma.theme.findMany({
      where: themeWhere,
      orderBy: { order: "asc" },
      include: {
        subThemes: {
          where: subThemeWhere,
          orderBy: { order: "asc" },
          include: {
            quizzes: {
              where: quizWhere,
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
