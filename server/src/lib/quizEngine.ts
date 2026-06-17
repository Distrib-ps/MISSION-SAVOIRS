import { Answer, Question } from "@prisma/client";
import prisma from "./prisma";

/**
 * Moteur de quiz partagé entre les quiz classiques et les révisions :
 * - assainissement des questions pour l'élève (masque les bonnes réponses)
 * - correction par type de question (pur, sans I/O)
 * - enregistrement d'une réponse + logique indice/solution + scoring
 *
 * Utilisé par `routes/student/quizzes.ts` et `routes/student/revisions.ts`.
 */

export type QuestionWithAnswers = Question & { answers: Answer[] };

/** Normalise une chaîne pour comparaison tolérante (trim, minuscule, sans accents). */
export function normalizeText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Mélange un tableau (Fisher-Yates) sans muter l'original. */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Construit la version « élève » d'une question : réponses mélangées,
 * sans révéler `isCorrect` ni les zones cibles.
 */
export function sanitizeQuestion(
  q: QuestionWithAnswers,
  opts: { isReinjected?: boolean } = {}
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: q.id,
    text: q.text,
    type: q.type,
    order: q.order,
    hint: null,
    solution: null,
    isReinjected: opts.isReinjected ?? false,
  };

  if (q.type === "QCM") {
    base.answers = shuffle(q.answers.map((a) => ({ id: a.id, text: a.text })));
    base.correctCount = q.answers.filter((a) => a.isCorrect).length;
  } else if (q.type === "DRAG_DROP") {
    base.answers = shuffle(q.answers.map((a) => ({ id: a.id, text: a.text })));
    base.zones = Array.from(
      new Set(q.answers.map((a) => a.zone).filter((z): z is string => !!z))
    );
  } else if (q.type === "ASSOCIATION") {
    base.answers = shuffle(q.answers.map((a) => ({ id: a.id, text: a.text })));
    base.rightColumn = shuffle(
      q.answers.map((a) => a.zone).filter((z): z is string => !!z)
    );
  } else if (q.type === "ORDERING") {
    base.answers = shuffle(q.answers.map((a) => ({ id: a.id, text: a.text })));
  }
  // DRAWING : aucun payload de réponses. TEXT : pas de réponses envoyées.

  return base;
}

export type CheckResult =
  | { ok: true; isCorrect: boolean; correctAnswerText: string; givenAnswerText: string }
  | { ok: false; error: string };

/**
 * Corrige une réponse selon le type de question. Fonction pure : ne dépend
 * que de la question (avec ses réponses) et de la réponse soumise.
 */
export function checkAnswer(question: QuestionWithAnswers, answer: string): CheckResult {
  let isCorrect = false;
  let correctAnswerText = "";
  let givenAnswerText = answer;

  if (question.type === "QCM") {
    const selectedIds = String(answer)
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (selectedIds.length === 0) {
      return { ok: false, error: "ID de réponse invalide pour une question QCM" };
    }

    const selectedAnswers = question.answers.filter((a) => selectedIds.includes(a.id));
    givenAnswerText = selectedAnswers.map((a) => a.text).join(", ");

    const correctAnswers = question.answers.filter((a) => a.isCorrect);
    const correctIds = new Set(correctAnswers.map((a) => a.id));
    const selectedSet = new Set(selectedIds);
    isCorrect =
      selectedSet.size === correctIds.size &&
      [...selectedSet].every((id) => correctIds.has(id));

    correctAnswerText = correctAnswers.map((a) => a.text).join(", ");
  } else if (question.type === "DRAG_DROP") {
    let mapping: Record<string, string> = {};
    try {
      mapping = JSON.parse(answer);
    } catch {
      return { ok: false, error: "Format de réponse invalide pour une question Drag & Drop" };
    }

    isCorrect = question.answers.every((a) => {
      const chosen = mapping[String(a.id)];
      return chosen !== undefined && chosen === a.zone;
    });

    givenAnswerText = question.answers
      .map((a) => `${a.text} → ${mapping[String(a.id)] ?? "—"}`)
      .join(" ; ");
    correctAnswerText = question.answers.map((a) => `${a.text} → ${a.zone ?? ""}`).join(" ; ");
  } else if (question.type === "ASSOCIATION") {
    let mapping: Record<string, string> = {};
    try {
      mapping = JSON.parse(answer);
    } catch {
      return { ok: false, error: "Format de réponse invalide pour une question Association" };
    }

    isCorrect = question.answers.every((a) => {
      const chosen = mapping[String(a.id)];
      return chosen !== undefined && chosen === a.zone;
    });

    givenAnswerText = question.answers
      .map((a) => `${a.text} ↔ ${mapping[String(a.id)] ?? "—"}`)
      .join(" ; ");
    correctAnswerText = question.answers.map((a) => `${a.text} ↔ ${a.zone ?? ""}`).join(" ; ");
  } else if (question.type === "DRAWING") {
    // Dessin : on stocke le base64 (évaluation manuelle par le prof). On valide
    // strictement que c'est une image data-URL et qu'elle reste sous une taille raisonnable.
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(answer)) {
      return { ok: false, error: "Format de dessin invalide (image attendue)" };
    }
    if (answer.length > 1_400_000) {
      // ~1 Mo d'image décodée
      return { ok: false, error: "Dessin trop volumineux" };
    }
    isCorrect = true;
    givenAnswerText = answer;
    correctAnswerText = "";
  } else if (question.type === "ORDERING") {
    let orderedIds: number[] = [];
    try {
      const parsed = JSON.parse(answer);
      if (!Array.isArray(parsed)) throw new Error();
      orderedIds = parsed.map((n) => Number(n));
    } catch {
      return { ok: false, error: "Format de réponse invalide pour une question de classement" };
    }

    const expected = [...question.answers].sort((a, b) => a.order - b.order).map((a) => a.id);
    isCorrect =
      orderedIds.length === expected.length &&
      orderedIds.every((id, i) => id === expected[i]);

    const answerById = new Map(question.answers.map((a) => [a.id, a.text]));
    givenAnswerText = orderedIds.map((id, i) => `${i + 1}. ${answerById.get(id) ?? "?"}`).join(" ; ");
    correctAnswerText = expected.map((id, i) => `${i + 1}. ${answerById.get(id) ?? "?"}`).join(" ; ");
  } else {
    // TEXT : comparaison tolérante
    const correct = question.answers.find((a) => a.isCorrect);
    if (correct) {
      correctAnswerText = correct.text;
      isCorrect = normalizeText(answer) === normalizeText(correct.text);
    }
  }

  return { ok: true, isCorrect, correctAnswerText, givenAnswerText };
}

/**
 * Enregistre une réponse pour une tentative (quiz OU révision), met à jour le
 * score, et construit la réponse API (indice au 1er échec, solution au 2nd+).
 * Renvoie `{ status, body }` à transmettre tel quel par la route.
 */
export async function recordAnswer(params: {
  attemptId: number;
  question: QuestionWithAnswers;
  answer: string;
  usedHint: boolean;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const { attemptId, question, answer, usedHint } = params;

  const check = checkAnswer(question, answer);
  if (!check.ok) return { status: 400, body: { error: check.error } };

  const { correctAnswerText, givenAnswerText } = check;
  // Les dessins ne sont PAS auto-validés : ils passent en attente de validation prof (#17)
  const isDrawing = question.type === "DRAWING";
  const isCorrect = isDrawing ? false : check.isCorrect;

  const existingAttempt = await prisma.questionAttempt.findFirst({
    where: { quizAttemptId: attemptId, questionId: question.id },
  });

  let questionAttemptCount: number;
  let wasAlreadyCorrect = false;

  if (existingAttempt) {
    wasAlreadyCorrect = existingAttempt.isCorrect;
    questionAttemptCount = existingAttempt.attempts + 1;

    await prisma.questionAttempt.update({
      where: { id: existingAttempt.id },
      data: {
        givenAnswer: givenAnswerText,
        // un dessin re-soumis repasse en attente (non acquis tant que non validé)
        isCorrect: isDrawing ? false : existingAttempt.isCorrect || isCorrect,
        usedHint: existingAttempt.usedHint || usedHint || false,
        attempts: questionAttemptCount,
        validationStatus: isDrawing ? "PENDING" : "NONE",
      },
    });
  } else {
    questionAttemptCount = 1;
    await prisma.questionAttempt.create({
      data: {
        quizAttemptId: attemptId,
        questionId: question.id,
        givenAnswer: givenAnswerText,
        isCorrect,
        usedHint: usedHint || false,
        attempts: 1,
        validationStatus: isDrawing ? "PENDING" : "NONE",
      },
    });
  }

  // Incrémente le score uniquement à la première bonne réponse (jamais pour un dessin en attente)
  if (!isDrawing && isCorrect && !wasAlreadyCorrect) {
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { score: { increment: 1 } },
    });
  }

  // Dessin : réponse "en attente de validation"
  if (isDrawing) {
    return { status: 200, body: { pending: true } };
  }

  const body: Record<string, unknown> = { correct: isCorrect };
  if (!isCorrect) {
    if (questionAttemptCount === 1) {
      body.hint = question.hint || null;
    } else if (questionAttemptCount >= 2) {
      body.solution = question.solution || null;
      body.correctAnswer = correctAnswerText;
    }
  }

  return { status: 200, body };
}
