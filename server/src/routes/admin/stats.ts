import { Router, Request, Response } from "express";
import { SchoolLevel } from "@prisma/client";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();
router.use(authenticate, requireAdmin);

const LEVELS: SchoolLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2"];

/** Taux de réussite (0-100) d'un lot de tentatives : moyenne de score/total. */
function successRate(attempts: { score: number; totalQuestions: number }[]): number {
  const valid = attempts.filter((a) => a.totalQuestions > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, a) => acc + a.score / a.totalQuestions, 0);
  return Math.round((sum / valid.length) * 100);
}

function isCompleted(a: { score: number; totalQuestions: number }): boolean {
  return a.totalQuestions > 0 && a.score >= Math.ceil(a.totalQuestions * 0.7);
}

/**
 * Récupération après erreur : parmi les questions qu'un élève a ratées au moins
 * une fois, part de celles qu'il a fini par réussir (concrétise « réduction des
 * erreurs sur notions répétées »). Clé = userId:questionId.
 */
function computeReinjection(
  qa: { questionId: number; isCorrect: boolean; quizAttempt: { userId: number } }[]
): { failed: number; recovered: number; recoveryRate: number } {
  const byKey = new Map<string, { wrong: boolean; correct: boolean }>();
  for (const a of qa) {
    const key = `${a.quizAttempt.userId}:${a.questionId}`;
    const e = byKey.get(key) ?? { wrong: false, correct: false };
    if (a.isCorrect) e.correct = true;
    else e.wrong = true;
    byKey.set(key, e);
  }
  let failed = 0;
  let recovered = 0;
  for (const e of byKey.values()) {
    if (e.wrong) {
      failed++;
      if (e.correct) recovered++;
    }
  }
  return { failed, recovered, recoveryRate: failed > 0 ? Math.round((recovered / failed) * 100) : 0 };
}

function parseLevel(raw: unknown): SchoolLevel | undefined {
  return typeof raw === "string" && LEVELS.includes(raw as SchoolLevel)
    ? (raw as SchoolLevel)
    : undefined;
}

/* ── GET /overview?level= ── KPIs globaux ── */
router.get("/overview", async (req: Request, res: Response): Promise<void> => {
  try {
    const level = parseLevel(req.query.level);
    const studentWhere = { role: "STUDENT" as const, ...(level ? { level } : {}) };

    // Tentatives de quiz (classiques + parcours perso) — révisions exclues (quizId null)
    const attemptWhere = {
      quizId: { not: null },
      ...(level ? { user: { level } } : {}),
    };
    const attempts = await prisma.quizAttempt.findMany({
      where: attemptWhere,
      select: {
        quizId: true,
        score: true,
        totalQuestions: true,
        user: { select: { level: true } },
        quiz: {
          select: {
            id: true,
            title: true,
            subTheme: { select: { theme: { select: { id: true, name: true, emoji: true } } } },
          },
        },
      },
    });

    // Cartes
    const studentsCount = await prisma.user.count({ where: studentWhere });
    const completedCount = attempts.filter(isCompleted).length;
    const themesCount = await prisma.theme.count();
    const quizzesCount = await prisma.quiz.count();

    // Par quiz
    const byQuiz = new Map<number, { title: string; theme: string; items: typeof attempts }>();
    for (const a of attempts) {
      if (!a.quiz) continue;
      const cur = byQuiz.get(a.quiz.id) ?? {
        title: a.quiz.title,
        theme: a.quiz.subTheme?.theme?.name ?? "—",
        items: [] as typeof attempts,
      };
      cur.items.push(a);
      byQuiz.set(a.quiz.id, cur);
    }
    const perQuiz = [...byQuiz.entries()]
      .map(([quizId, v]) => ({
        quizId,
        title: v.title,
        theme: v.theme,
        attempts: v.items.length,
        successRate: successRate(v.items),
      }))
      .sort((a, b) => b.attempts - a.attempts);

    // Par thème
    const byTheme = new Map<number, { name: string; emoji: string; items: typeof attempts }>();
    for (const a of attempts) {
      const theme = a.quiz?.subTheme?.theme;
      if (!theme) continue;
      const cur = byTheme.get(theme.id) ?? { name: theme.name, emoji: theme.emoji, items: [] as typeof attempts };
      cur.items.push(a);
      byTheme.set(theme.id, cur);
    }
    const perTheme = [...byTheme.entries()].map(([themeId, v]) => ({
      themeId,
      name: v.name,
      emoji: v.emoji,
      attempts: v.items.length,
      successRate: successRate(v.items),
    }));

    // Par niveau
    const studentsByLevel = await prisma.user.groupBy({
      by: ["level"],
      where: { role: "STUDENT" },
      _count: { _all: true },
    });
    const byLevel = LEVELS.map((lv) => {
      const items = attempts.filter((a) => a.user?.level === lv);
      const sc = studentsByLevel.find((s) => s.level === lv)?._count._all ?? 0;
      return { level: lv, students: sc, attempts: items.length, successRate: successRate(items) };
    });

    // Indices + réinjection
    const qAttempts = await prisma.questionAttempt.findMany({
      where: { quizAttempt: { quizId: { not: null }, ...(level ? { user: { level } } : {}) } },
      select: { questionId: true, isCorrect: true, usedHint: true, quizAttempt: { select: { userId: true } } },
    });
    const hintUsed = qAttempts.filter((q) => q.usedHint).length;
    const hintUsageRate = qAttempts.length > 0 ? Math.round((hintUsed / qAttempts.length) * 100) : 0;
    const reinjection = computeReinjection(qAttempts);

    res.json({
      cards: {
        students: studentsCount,
        attempts: attempts.length,
        completed: completedCount,
        avgSuccessRate: successRate(attempts),
        themes: themesCount,
        quizzes: quizzesCount,
      },
      perQuiz,
      perTheme,
      byLevel,
      hintUsageRate,
      reinjection,
    });
  } catch (error) {
    console.error("Erreur stats/overview:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET /students?level= ── Récap par élève ── */
router.get("/students", async (req: Request, res: Response): Promise<void> => {
  try {
    const level = parseLevel(req.query.level);
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", ...(level ? { level } : {}) },
      select: { id: true, firstName: true, lastName: true, level: true },
      orderBy: [{ level: "asc" }, { firstName: "asc" }],
    });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: { not: null }, userId: { in: students.map((s) => s.id) } },
      select: { userId: true, score: true, totalQuestions: true, completedAt: true },
    });
    const byUser = new Map<number, typeof attempts>();
    for (const a of attempts) {
      const arr = byUser.get(a.userId) ?? [];
      arr.push(a);
      byUser.set(a.userId, arr);
    }

    const rows = students.map((s) => {
      const items = byUser.get(s.id) ?? [];
      const last = items.reduce<Date | null>(
        (acc, a) => (!acc || a.completedAt > acc ? a.completedAt : acc),
        null
      );
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        level: s.level,
        attempts: items.length,
        completed: items.filter(isCompleted).length,
        avgSuccessRate: successRate(items),
        lastActivity: last,
      };
    });

    res.json({ students: rows });
  } catch (error) {
    console.error("Erreur stats/students:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET /students/:id ── Détail d'un élève ── */
router.get("/students/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }

    const student = await prisma.user.findFirst({
      where: { id, role: "STUDENT" },
      select: { id: true, firstName: true, lastName: true, level: true },
    });
    if (!student) {
      res.status(404).json({ error: "Élève introuvable" });
      return;
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: id, quizId: { not: null } },
      orderBy: { completedAt: "asc" },
      select: {
        quizId: true,
        score: true,
        totalQuestions: true,
        completedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            subTheme: { select: { theme: { select: { id: true, name: true, emoji: true } } } },
          },
        },
      },
    });

    // Par thème
    const byTheme = new Map<number, { name: string; emoji: string; items: typeof attempts }>();
    for (const a of attempts) {
      const theme = a.quiz?.subTheme?.theme;
      if (!theme) continue;
      const cur = byTheme.get(theme.id) ?? { name: theme.name, emoji: theme.emoji, items: [] as typeof attempts };
      cur.items.push(a);
      byTheme.set(theme.id, cur);
    }
    const perTheme = [...byTheme.entries()].map(([themeId, v]) => ({
      themeId,
      name: v.name,
      emoji: v.emoji,
      attempts: v.items.length,
      successRate: successRate(v.items),
    }));

    // Progression chronologique
    const progression = attempts.map((a) => ({
      date: a.completedAt,
      quizTitle: a.quiz?.title ?? "—",
      score: a.score,
      total: a.totalQuestions,
      rate: a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0,
    }));

    // Indices + réinjection + points faibles (avec détail question)
    const qAttempts = await prisma.questionAttempt.findMany({
      where: { quizAttempt: { userId: id, quizId: { not: null } } },
      select: {
        questionId: true,
        isCorrect: true,
        usedHint: true,
        quizAttempt: { select: { userId: true, quizId: true } },
        question: {
          select: {
            text: true,
            quiz: {
              select: { title: true, subTheme: { select: { theme: { select: { name: true, emoji: true } } } } },
            },
          },
        },
      },
    });
    const hintUsed = qAttempts.filter((q) => q.usedHint).length;
    const hintUsageRate = qAttempts.length > 0 ? Math.round((hintUsed / qAttempts.length) * 100) : 0;
    const reinjection = computeReinjection(qAttempts);

    // Par quiz : agrège les tentatives de l'élève par quiz
    const hintByQuiz = new Map<number, number>();
    for (const q of qAttempts) {
      const qid = q.quizAttempt.quizId;
      if (qid != null && q.usedHint) hintByQuiz.set(qid, (hintByQuiz.get(qid) ?? 0) + 1);
    }
    const byQuiz = new Map<number, { title: string; theme: string; items: typeof attempts }>();
    for (const a of attempts) {
      if (!a.quiz) continue;
      const cur = byQuiz.get(a.quiz.id) ?? {
        title: a.quiz.title,
        theme: a.quiz.subTheme?.theme?.name ?? "—",
        items: [] as typeof attempts,
      };
      cur.items.push(a);
      byQuiz.set(a.quiz.id, cur);
    }
    const perQuiz = [...byQuiz.entries()].map(([quizId, v]) => {
      const rate = (x: { score: number; totalQuestions: number }) =>
        x.totalQuestions > 0 ? Math.round((x.score / x.totalQuestions) * 100) : 0;
      const bestRate = Math.max(...v.items.map(rate));
      const last = v.items[v.items.length - 1]; // items triés par completedAt asc
      return {
        quizId,
        title: v.title,
        theme: v.theme,
        attempts: v.items.length,
        bestRate,
        lastRate: rate(last),
        lastScore: last.score,
        total: last.totalQuestions,
        hintCount: hintByQuiz.get(quizId) ?? 0,
        completed: v.items.some(isCompleted),
      };
    });

    // Points faibles : questions les plus ratées par l'élève
    const byQuestion = new Map<
      number,
      { text: string; quiz: string; emoji: string; wrong: number; correct: boolean }
    >();
    for (const q of qAttempts) {
      const cur =
        byQuestion.get(q.questionId) ?? {
          text: q.question?.text ?? "—",
          quiz: q.question?.quiz?.title ?? "—",
          emoji: q.question?.quiz?.subTheme?.theme?.emoji ?? "",
          wrong: 0,
          correct: false,
        };
      if (q.isCorrect) cur.correct = true;
      else cur.wrong += 1;
      byQuestion.set(q.questionId, cur);
    }
    const weakPoints = [...byQuestion.entries()]
      .filter(([, v]) => v.wrong > 0)
      .map(([questionId, v]) => ({
        questionId,
        text: v.text,
        quiz: v.quiz,
        emoji: v.emoji,
        wrongCount: v.wrong,
        recovered: v.correct,
      }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 10);

    res.json({
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        level: student.level,
      },
      summary: {
        attempts: attempts.length,
        completed: attempts.filter(isCompleted).length,
        avgSuccessRate: successRate(attempts),
      },
      perQuiz,
      perTheme,
      progression,
      weakPoints,
      hintUsageRate,
      reinjection,
    });
  } catch (error) {
    console.error("Erreur stats/students/:id:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

/* ── GET /students/:id/quizzes/:quizId/questions ── Détail question par question ── */
router.get(
  "/students/:id/quizzes/:quizId/questions",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const quizId = parseInt(
        Array.isArray(req.params.quizId) ? req.params.quizId[0] : req.params.quizId,
        10
      );
      if (isNaN(id) || isNaN(quizId)) {
        res.status(400).json({ error: "ID invalide" });
        return;
      }

      // Tentatives de questions de l'élève sur ce quiz (questions propres au quiz)
      const qAttempts = await prisma.questionAttempt.findMany({
        where: {
          quizAttempt: { userId: id, quizId },
          question: { quizId },
        },
        select: {
          questionId: true,
          isCorrect: true,
          usedHint: true,
          attempts: true,
          givenAnswer: true,
          question: { select: { text: true, type: true, order: true } },
        },
      });

      // Agrège par question (un élève peut avoir plusieurs tentatives du quiz)
      const byQ = new Map<
        number,
        {
          text: string;
          type: string;
          order: number;
          correct: boolean;
          wrong: number;
          usedHint: boolean;
          lastAnswer: string;
        }
      >();
      for (const a of qAttempts) {
        const cur =
          byQ.get(a.questionId) ?? {
            text: a.question?.text ?? "—",
            type: a.question?.type ?? "",
            order: a.question?.order ?? 0,
            correct: false,
            wrong: 0,
            usedHint: false,
            lastAnswer: "",
          };
        if (a.isCorrect) cur.correct = true;
        else cur.wrong += 1;
        if (a.usedHint) cur.usedHint = true;
        // réponse donnée lisible (les dessins sont en base64 → on masque)
        const ans = a.question?.type === "DRAWING" ? "(dessin)" : a.givenAnswer ?? "";
        cur.lastAnswer = ans.length > 140 ? `${ans.slice(0, 140)}…` : ans;
        byQ.set(a.questionId, cur);
      }

      const questions = [...byQ.entries()]
        .map(([questionId, v]) => ({
          questionId,
          text: v.text,
          type: v.type,
          correct: v.correct,
          wrongCount: v.wrong,
          usedHint: v.usedHint,
          givenAnswer: v.lastAnswer,
        }))
        .sort((a, b) => a.questionId - b.questionId);

      res.json({ questions });
    } catch (error) {
      console.error("Erreur stats détail questions:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }
);

export default router;
