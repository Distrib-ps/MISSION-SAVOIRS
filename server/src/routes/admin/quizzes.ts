import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { authenticate, requireStaff } from "../../middleware/auth";
import { contentOwnerWhere, currentUserId, isOwner } from "../../lib/ownership";

const router = Router();

// All routes require authentication + staff role (ADMIN ou TEACHER)
router.use(authenticate, requireStaff);

// ---------- GET / - List quizzes for a given subtheme ----------
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { subThemeId } = req.query;

    if (!subThemeId || typeof subThemeId !== "string") {
      res.status(400).json({ error: "Le paramètre subThemeId est requis" });
      return;
    }

    const parsedSubThemeId = parseInt(subThemeId, 10);

    if (isNaN(parsedSubThemeId)) {
      res.status(400).json({ error: "subThemeId invalide" });
      return;
    }

    const quizzes = await prisma.quiz.findMany({
      where: { subThemeId: parsedSubThemeId, ...contentOwnerWhere(req) },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { questions: true } },
        classes: { select: { classId: true } },
      },
    });

    res.json({ quizzes });
  } catch (error) {
    console.error("Erreur lors de la récupération des quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- POST / - Create a quiz ----------
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, timeLimit, subThemeId, classIds, visibility } = req.body as {
      title?: string;
      description?: string | null;
      timeLimit?: number | null;
      subThemeId?: number;
      classIds?: number[];
      visibility?: "PUBLIC" | "PRIVATE";
    };

    if (!title) {
      res.status(400).json({ error: "Le champ title est requis" });
      return;
    }

    if (!subThemeId) {
      res.status(400).json({ error: "Le champ subThemeId est requis" });
      return;
    }

    // Verify subTheme exists
    const subTheme = await prisma.subTheme.findUnique({
      where: { id: subThemeId },
    });
    if (!subTheme) {
      res.status(404).json({ error: "Sous-thème introuvable" });
      return;
    }

    // Auto-set order to max + 1 within this subTheme
    const maxOrder = await prisma.quiz.aggregate({
      where: { subThemeId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description ?? null,
        timeLimit: timeLimit ?? null,
        subThemeId,
        order: nextOrder,
        createdById: currentUserId(req),
        visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        ...(Array.isArray(classIds) && classIds.length > 0
          ? { classes: { create: classIds.map((classId) => ({ classId })) } }
          : {}),
      },
      include: {
        _count: { select: { questions: true } },
        classes: { select: { classId: true } },
      },
    });

    res.status(201).json({ quiz });
  } catch (error) {
    console.error("Erreur lors de la création du quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /reorder - Reorder quizzes (MUST be before /:id) ----------
router.put("/reorder", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "La liste des IDs est requise" });
      return;
    }

    // (filtre de propriété : un prof ne réordonne que ses propres quiz)
    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.quiz.updateMany({
          where: { id, ...contentOwnerWhere(req) },
          data: { order: index },
        })
      )
    );

    res.json({ message: "Ordre des quiz mis à jour" });
  } catch (error) {
    console.error("Erreur lors du réordonnancement des quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- PUT /:id - Update a quiz ----------
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.quiz.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Quiz introuvable" });
      return;
    }

    if (!isOwner(req) && existing.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : contenu d'un autre professeur" });
      return;
    }

    const { title, description, timeLimit, order, classIds, visibility } = req.body as {
      title?: string;
      description?: string | null;
      timeLimit?: number | null;
      order?: number;
      classIds?: number[];
      visibility?: "PUBLIC" | "PRIVATE";
    };
    const data: Record<string, unknown> = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (timeLimit !== undefined) data.timeLimit = timeLimit;
    if (order !== undefined) data.order = order;
    if (visibility !== undefined) data.visibility = visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC";

    const quiz = await prisma.$transaction(async (tx) => {
      // Remplace le ciblage de classes si fourni (tableau vide = visible par tous)
      if (classIds !== undefined) {
        await tx.quizClass.deleteMany({ where: { quizId: id } });
        if (Array.isArray(classIds) && classIds.length > 0) {
          await tx.quizClass.createMany({
            data: classIds.map((classId) => ({ quizId: id, classId })),
          });
        }
      }
      return tx.quiz.update({
        where: { id },
        data,
        include: {
          _count: { select: { questions: true } },
          classes: { select: { classId: true } },
        },
      });
    });

    res.json({ quiz });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// ---------- DELETE /:id - Delete a quiz (cascade) ----------
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const existing = await prisma.quiz.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Quiz introuvable" });
      return;
    }

    if (!isOwner(req) && existing.createdById !== currentUserId(req)) {
      res.status(403).json({ error: "Accès refusé : contenu d'un autre professeur" });
      return;
    }

    await prisma.quiz.delete({ where: { id } });

    res.json({ message: "Quiz supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du quiz:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ══════════ Co-accès : partage d'un quiz en lecture ══════════ */

// Vérifie que l'utilisateur peut gérer les partages du quiz (propriétaire ou Owner)
async function canManageShares(req: Request, quizId: number): Promise<boolean> {
  if (isOwner(req)) {
    const q = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
    return !!q;
  }
  const q = await prisma.quiz.findFirst({
    where: { id: quizId, createdById: currentUserId(req) },
    select: { id: true },
  });
  return !!q;
}

// GET /:id/shares - liste des profs ayant le co-accès
router.get("/:id/shares", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    if (!(await canManageShares(req, id))) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
    const shares = await prisma.quizShare.findMany({
      where: { quizId: id },
      select: { teacherId: true },
    });
    res.json({ teacherIds: shares.map((s) => s.teacherId) });
  } catch (error) {
    console.error("Erreur quiz shares GET:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// POST /:id/shares { teacherId } - partager le quiz à un prof
router.post("/:id/shares", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { teacherId } = req.body as { teacherId?: number };
    if (isNaN(id) || !teacherId) {
      res.status(400).json({ error: "ID quiz et teacherId requis" });
      return;
    }
    if (!(await canManageShares(req, id))) {
      res.status(403).json({ error: "Accès refusé : vous n'êtes pas propriétaire de ce quiz" });
      return;
    }
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "TEACHER" },
      select: { id: true },
    });
    if (!teacher) {
      res.status(404).json({ error: "Professeur introuvable" });
      return;
    }
    await prisma.quizShare.upsert({
      where: { quizId_teacherId: { quizId: id, teacherId } },
      create: { quizId: id, teacherId },
      update: {},
    });
    res.status(201).json({ message: "Quiz partagé" });
  } catch (error) {
    console.error("Erreur quiz shares POST:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// DELETE /:id/shares/:teacherId - retirer le co-accès
router.delete("/:id/shares/:teacherId", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const teacherId = parseInt(
      Array.isArray(req.params.teacherId) ? req.params.teacherId[0] : req.params.teacherId,
      10
    );
    if (isNaN(id) || isNaN(teacherId)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    if (!(await canManageShares(req, id))) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
    await prisma.quizShare.deleteMany({ where: { quizId: id, teacherId } });
    res.json({ message: "Partage retiré" });
  } catch (error) {
    console.error("Erreur quiz shares DELETE:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

export default router;
