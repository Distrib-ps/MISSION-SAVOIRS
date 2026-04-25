export type Level = "CP" | "CE1" | "CE2" | "CM1" | "CM2";
export type Role = "ADMIN" | "STUDENT";

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  level?: Level | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  level: Level;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  level?: Level;
  password?: string;
}

export interface ImportedUser {
  prenom: string;
  nom: string;
  identifiant: string;
  motDePasse: string;
  niveau: string;
}

export interface ImportResult {
  created: number;
  errors: string[];
  createdUsers: ImportedUser[];
}

export interface Theme {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  order: number;
  _count?: { subThemes: number };
}

export interface SubTheme {
  id: number;
  name: string;
  description: string | null;
  order: number;
  themeId: number;
  _count?: { quizzes: number };
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  timeLimit: number | null;
  order: number;
  subThemeId: number;
  _count?: { questions: number };
}

export interface Answer {
  id?: number;
  text: string;
  isCorrect: boolean;
  zone?: string | null;
  order?: number;
}

export interface Question {
  id: number;
  text: string;
  type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING";
  hint: string | null;
  solution: string | null;
  order: number;
  quizId: number;
  answers: Answer[];
}

/* ── Student-facing types ── */

export interface StudentTheme {
  id: number;
  name: string;
  description: string | null;
  emoji: string;
  order: number;
  _count: { subThemes: number };
}

export interface StudentSubTheme {
  id: number;
  name: string;
  description: string | null;
  order: number;
  themeId: number;
  _count: { quizzes: number };
}

export interface StudentQuiz {
  id: number;
  title: string;
  description: string | null;
  order: number;
  subThemeId: number;
  _count: { questions: number };
  bestScore: number | null;
  totalQuestions: number;
  status: "completed" | "available" | "locked";
}

/* ── Quiz play types ── */

export interface QuizQuestion {
  id: number;
  text: string;
  type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING";
  hint: string | null;
  solution: string | null;
  order: number;
  answers?: { id: number; text: string }[]; // QCM / DRAG_DROP / ASSOCIATION / ORDERING
  correctCount?: number; // how many correct answers (for multi-select QCM)
  zones?: string[]; // DRAG_DROP only: list of target zones
  rightColumn?: string[]; // ASSOCIATION only: shuffled right column labels
  isReinjected?: boolean; // question from a previous quiz (revision)
}

export interface QuizSession {
  attemptId: number;
  quiz: { id: number; title: string; timeLimit: number | null };
  questions: QuizQuestion[];
}

export interface AnswerResult {
  correct: boolean;
  correctAnswer?: string;
  hint?: string | null;
  solution?: string | null;
}

export interface QuizResults {
  quiz: { id: number; title: string };
  score: number;
  totalQuestions: number;
  questions: {
    id: number;
    text: string;
    type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING";
    givenAnswer: string;
    isCorrect: boolean;
    usedHint: boolean;
    attempts: number;
    correctAnswer: string;
  }[];
}
