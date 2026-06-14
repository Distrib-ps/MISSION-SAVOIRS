import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { contentOwnerWhere, currentUserId, isOwner } from "../../lib/ownership";

const router = Router();

// All routes require authentication + staff role (ADMIN ou TEACHER)
router.use(authenticate, requireStaff);

// ---------- GET / - List all themes with subThemes count ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const themes = await prisma.theme.findMany({
      where: { ...contentOwnerWhere(req) },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { subThemes: true } },
      },
    });

    res.json({ themes });
  } catch (error) {
    console.error("Erreur lors de la récupération des thèmes:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST / - Create a theme ----------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, emoji } = req.body;

    if (!name) {
      res.status(400).json({ error: "Le champ name est requis" });
      return;
    }

    // Auto-set order to max + 1
    const maxOrder = await prisma.theme.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const theme = await prisma.theme.create({
      data: {
        name,
        description: description ?? null,
        emoji: emoji ?? "📚",
        order: nextOrder,
        createdById: currentUserId(req),
      },
      include: {
        _count: { select: { subThemes: true } },
      },
    });

    res.status(201).json({ theme });
  } catch (error) {
    console.error("Erreur lors de la création du thème:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      res.status(409).json({ error: "Un thème avec ce nom existe déjà" });
      return;
    }
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /reorder - Reorder themes (MUST be before /:id) ----------
router.put("/reorder", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "La liste des IDs est requise" });
      return;
    }

    // Update each theme's order based on its index in the array
    // (filtre de propriété : un prof ne réordonne que ses propres thèmes)
    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.theme.updateMany({
          where: { id, ...contentOwnerWhere(req) },
          data: { order: index },
        })
      )
    );

    res.json({ message: "Ordre des thèmes mis à jour" });
  } catch (error) {
    console.error("Erreur lors du réordonnancement des thèmes:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /:id - Update a theme ----------
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.theme.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Thème introuvable" });
      return;
    }

    if (!isOwner(req) && existing.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : contenu d'un autre professeur" });
      return;
    }

    const { name, description, emoji, order } = req.body;
    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (emoji !== undefined) data.emoji = emoji;
    if (order !== undefined) data.order = order;

    const theme = await prisma.theme.update({
      where: { id },
      data,
      include: {
        _count: { select: { subThemes: true } },
      },
    });

    res.json({ theme });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du thème:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      res.status(409).json({ error: "Un thème avec ce nom existe déjà" });
      return;
    }
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- DELETE /:id - Delete a theme (cascade) ----------
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.theme.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Thème introuvable" });
      return;
    }

    if (!isOwner(req) && existing.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : contenu d'un autre professeur" });
      return;
    }

    await prisma.theme.delete({ where: { id } });

    res.json({ message: "Thème supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du thème:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
