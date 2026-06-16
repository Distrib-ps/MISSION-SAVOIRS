export type Level = "CP" | "CE1" | "CE2" | "CM1" | "CM2";
export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  level?: Level | null;
  classes?: { id: number; name: string; level?: Level }[];
}

export interface Classe {
  id: number;
  name: string;
  level: Level;
  _count?: { students: number };
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
  createdById?: number | null;
  _count?: { questions: number };
  classes?: { classId: number }[];
}

export interface SharedQuizRow {
  id: number;
  title: string;
  description: string | null;
  totalQuestions: number;
  theme: string;
  emoji: string;
  subTheme: string;
  owner: string;
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
  type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING" | "DRAWING";
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
  status: "completed" | "available" | "locked" | "pending";
}

/* ── Quiz play types ── */

export interface QuizQuestion {
  id: number;
  text: string;
  type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING" | "DRAWING";
  hint: string | null;
  solution: string | null;
  order: number;
  answers?: { id: number; text: string }[]; // QCM / DRAG_DROP / ASSOCIATION / ORDERING
  correctCount?: number; // how many correct answers (for multi-select QCM)
  zones?: string[]; // DRAG_DROP only: list of target zones
  rightColumn?: string[]; // ASSOCIATION only: shuffled right column labels
  isReinjected?: boolean; // question from a previous quiz (revision)
}

/* ── Custom paths ── */

export interface CustomPathQuiz {
  id: number;
  title: string;
  description: string | null;
  order: number;
  totalQuestions: number;
  bestScore: number | null;
  completed: boolean;
}

export interface CustomPath {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  quizzes: CustomPathQuiz[];
}

/* ── Révisions par niveau ── */

export type SchoolLevel = "CP" | "CE1" | "CE2" | "CM1" | "CM2";

// Vue élève (dashboard)
export interface StudentRevision {
  id: number;
  name: string;
  description: string | null;
  totalQuestions: number;
  endDate: string | null;
  bestScore: number | null;
  completed: boolean;
}

// Vue admin (CRUD)
export interface AdminRevisionQuestion {
  order: number;
  question: {
    id: number;
    text: string;
    type: string;
    quiz: {
      id: number;
      title: string;
      subTheme: { id: number; name: string; theme: { id: number; name: string; emoji: string } };
    };
  };
}

export interface AdminRevision {
  id: number;
  name: string;
  description: string | null;
  targetLevel: SchoolLevel;
  endDate: string | null;
  questions: AdminRevisionQuestion[];
}

export interface QuizSession {
  attemptId: number;
  quiz: { id: number; title: string; timeLimit: number | null };
  questions: QuizQuestion[];
}

export type ValidationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface AnswerResult {
  correct: boolean;
  pending?: boolean; // dessin en attente de validation
  correctAnswer?: string;
  hint?: string | null;
  solution?: string | null;
}

export interface PendingDrawing {
  attemptId: number;
  image: string;
  questionText: string;
  quizTitle: string;
  student: string;
  submittedAt: string;
}

export interface QuizResults {
  quiz: { id: number; title: string };
  score: number;
  totalQuestions: number;
  questions: {
    id: number;
    text: string;
    type: "QCM" | "TEXT" | "DRAG_DROP" | "ASSOCIATION" | "ORDERING" | "DRAWING";
    givenAnswer: string;
    isCorrect: boolean;
    usedHint: boolean;
    attempts: number;
    validationStatus?: ValidationStatus;
    correctAnswer: string;
  }[];
}

/* ── KPI / Statistiques (admin) ── */

export interface StatsOverview {
  cards: {
    students: number;
    attempts: number;
    completed: number;
    avgSuccessRate: number;
    themes: number;
    quizzes: number;
  };
  perQuiz: { quizId: number; title: string; theme: string; attempts: number; successRate: number }[];
  perTheme: { themeId: number; name: string; emoji: string; attempts: number; successRate: number }[];
  byLevel: { level: SchoolLevel | null; students: number; attempts: number; successRate: number }[];
  hintUsageRate: number;
  reinjection: { failed: number; recovered: number; recoveryRate: number };
}

export interface QuizQuestionDetail {
  questionId: number;
  text: string;
  type: string;
  correct: boolean;
  wrongCount: number;
  usedHint: boolean;
  givenAnswer: string;
}

export interface StudentStatRow {
  id: number;
  name: string;
  level: SchoolLevel | null;
  attempts: number;
  completed: number;
  avgSuccessRate: number;
  lastActivity: string | null;
}

export interface StudentStatDetail {
  student: { id: number; name: string; level: SchoolLevel | null };
  summary: { attempts: number; completed: number; avgSuccessRate: number };
  perQuiz: {
    quizId: number;
    title: string;
    theme: string;
    attempts: number;
    bestRate: number;
    lastRate: number;
    lastScore: number;
    total: number;
    hintCount: number;
    completed: boolean;
  }[];
  perTheme: { themeId: number; name: string; emoji: string; attempts: number; successRate: number }[];
  progression: { date: string; quizTitle: string; score: number; total: number; rate: number }[];
  weakPoints: {
    questionId: number;
    text: string;
    quiz: string;
    emoji: string;
    wrongCount: number;
    recovered: boolean;
  }[];
  hintUsageRate: number;
  reinjection: { failed: number; recovered: number; recoveryRate: number };
}
