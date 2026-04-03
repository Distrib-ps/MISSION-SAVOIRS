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
  order: number;
  subThemeId: number;
  _count?: { questions: number };
}

export interface Answer {
  id?: number;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  text: string;
  type: "QCM" | "TEXT";
  hint: string | null;
  solution: string | null;
  order: number;
  quizId: number;
  answers: Answer[];
}
