import { Router, Request, Response } from "express";
import { SchoolLevel } from "@prisma/client";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();
router.use(authenticate, requireAdmin);

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

/* ── GET / - Liste des classes ── */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: { _count: { select: { students: true } } },
    });
    res.json({ classes });
  } catch (error) {
    console.error("Erreur classes GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── POST / - Créer une classe ── */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, level } = req.body as { name: string; level: SchoolLevel };
    if (!name || !level) {
      res.status(400).json({ error: "name et level sont requis" });
      return;
    }
    if (!LEVELS.includes(level)) {
      res.status(400).json({ error: "level invalide" });
      return;
    }
    const existing = await prisma.class.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ error: "Une classe porte déjà ce nom" });
      return;
    }
    const created = await prisma.class.create({ data: { name, level } });
    res.status(201).json({ class: created });
  } catch (error) {
    console.error("Erreur classes POST:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── PUT /:id - Modifier une classe ── */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Classe introuvable" });
      return;
    }
    const { name, level } = req.body as { name?: string; level?: SchoolLevel };
    if (level !== undefined && !LEVELS.includes(level)) {
      res.status(400).json({ error: "level invalide" });
      return;
    }
    const data: { name?: string; level?: SchoolLevel } = {};
    if (name !== undefined) data.name = name;
    if (level !== undefined) data.level = level;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.class.update({ where: { id }, data });
      // Si le niveau change, resynchroniser le niveau des élèves de la classe
      if (level !== undefined && level !== existing.level) {
        await tx.user.updateMany({ where: { classId: id }, data: { level } });
      }
      return c;
    });

    res.json({ class: updated });
  } catch (error) {
    console.error("Erreur classes PUT:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── DELETE /:id ── (les élèves sont détachés via onDelete: SetNull) */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Classe introuvable" });
      return;
    }
    await prisma.class.delete({ where: { id } });
    res.json({ message: "Classe supprimée avec succès" });
  } catch (error) {
    console.error("Erreur classes DELETE:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
