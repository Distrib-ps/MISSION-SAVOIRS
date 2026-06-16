import { Router, Request, Response } from "express";
import { SchoolLevel } from "@prisma/client";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { currentUserId, isOwner } from "../../lib/ownership";

const router = Router();
router.use(authenticate, requireStaff);

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

/* ── GET / - Liste des classes ── */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { students: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
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
    const created = await prisma.class.create({
      data: { name, level, teacherId: currentUserId(req) },
    });
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
    if (!isOwner(req) && existing.teacherId !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : classe d'un autre professeur" });
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

    // Le niveau de l'élève est désormais décorrélé des classes (multi-appartenance) : pas de resync.
    const updated = await prisma.class.update({ where: { id }, data });

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
    if (!isOwner(req) && existing.teacherId !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : classe d'un autre professeur" });
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
