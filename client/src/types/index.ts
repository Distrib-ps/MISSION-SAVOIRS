export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "STUDENT";
  level?: "CP" | "CE1" | "CE2" | "CM1" | "CM2" | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
