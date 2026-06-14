import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { contentOwnerWhere, currentUserId, isOwner } from "../../lib/ownership";

const router = Router();

// All routes require authentication + staff role (ADMIN ou TEACHER)
router.use(authenticate, requireStaff);

// ---------- GET / - List subthemes for a given theme ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { themeId } = req.query;

    if (!themeId || typeof themeId !== "string") {
      res.status(400).json({ error: "Le paramètre themeId est requis" });
      return;
    }

    const parsedThemeId = parseInt(themeId, 10);

    if (isNaN(parsedThemeId)) {
      res.status(400).json({ error: "themeId invalide" });
      return;
    }

    const subThemes = await prisma.subTheme.findMany({
      where: { themeId: parsedThemeId, ...contentOwnerWhere(req) },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { quizzes: true } },
      },
    });

    res.json({ subThemes });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-thèmes:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST / - Create a subtheme ----------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, themeId } = req.body;

    if (!name) {
      res.status(400).json({ error: "Le champ name est requis" });
      return;
    }

    if (!themeId) {
      res.status(400).json({ error: "Le champ themeId est requis" });
      return;
    }

    // Verify theme exists
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      res.status(404).json({ error: "Thème introuvable" });
      return;
    }

    // Auto-set order to max + 1 within this theme
    const maxOrder = await prisma.subTheme.aggregate({
      where: { themeId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const subTheme = await prisma.subTheme.create({
      data: {
        name,
        description: description ?? null,
        themeId,
        order: nextOrder,
        createdById: currentUserId(req),
      },
      include: {
        _count: { select: { quizzes: true } },
      },
    });

    res.status(201).json({ subTheme });
  } catch (error) {
    console.error("Erreur lors de la création du sous-thème:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      res
        .status(409)
        .json({ error: "Un sous-thème avec ce nom existe déjà dans ce thème" });
      return;
    }
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /reorder - Reorder subthemes (MUST be before /:id) ----------
router.put("/reorder", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "La liste des IDs est requise" });
      return;
    }

    // (filtre de propriété : un prof ne réordonne que ses propres sous-thèmes)
    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.subTheme.updateMany({
          where: { id, ...contentOwnerWhere(req) },
          data: { order: index },
        })
      )
    );

    res.json({ message: "Ordre des sous-thèmes mis à jour" });
  } catch (error) {
    console.error(
      "Erreur lors du réordonnancement des sous-thèmes:",
      error
    );
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /:id - Update a subtheme ----------
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.subTheme.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Sous-thème introuvable" });
      return;
    }

    if (!isOwner(req) && existing.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : contenu d'un autre professeur" });
      return;
    }

    const { name, description, order } = req.body;
    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (order !== undefined) data.order = order;

    const subTheme = await prisma.subTheme.update({
      where: { id },
      data,
      include: {
        _count: { select: { quizzes: true } },
      },
    });

    res.json({ subTheme });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du sous-thème:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      res
        .status(409)
        .json({ error: "Un sous-thème avec ce nom existe déjà dans ce thème" });
      return;
    }
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- DELETE /:id - Delete a subtheme (cascade) ----------
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.subTheme.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Sous-thème introuvable" });
      return;
    }

    if (!isOwner(req) && existing.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : contenu d'un autre professeur" });
      return;
    }

    await prisma.subTheme.delete({ where: { id } });

    res.json({ message: "Sous-thème supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du sous-thème:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
