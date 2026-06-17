import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { encryptionKeyIsValid } from "./lib/crypto";
import authRouter from "./routes/auth";
import adminUsersRouter from "./routes/admin/users";
import adminThemesRouter from "./routes/admin/themes";
import adminSubThemesRouter from "./routes/admin/subthemes";
import adminQuizzesRouter from "./routes/admin/quizzes";
import adminQuestionsRouter from "./routes/admin/questions";
import adminTreeRouter from "./routes/admin/tree";
import adminCustomPathsRouter from "./routes/admin/customPaths";
import adminRevisionsRouter from "./routes/admin/revisions";
import adminStatsRouter from "./routes/admin/stats";
import adminClassesRouter from "./routes/admin/classes";
import adminSharedQuizzesRouter from "./routes/admin/sharedQuizzes";
import adminDrawingsRouter from "./routes/admin/drawings";
import studentThemesRouter from "./routes/student/themes";
import studentQuizzesRouter from "./routes/student/quizzes";
import studentCustomPathsRouter from "./routes/student/customPaths";
import studentRevisionsRouter from "./routes/student/revisions";

dotenv.config();

// Garde-fou : refuse de démarrer avec un secret JWT absent ou laissé à sa valeur par défaut.
const FORBIDDEN_SECRETS = new Set(["", "change-me-in-production", "secret", "dev"]);
if (!process.env.JWT_SECRET || FORBIDDEN_SECRETS.has(process.env.JWT_SECRET)) {
  console.error(
    "[FATAL] JWT_SECRET manquant ou laissé à sa valeur par défaut. " +
      "Générez un secret fort, ex. : openssl rand -base64 48"
  );
  process.exit(1);
}

// Clé de chiffrement des données personnelles (noms). Obligatoire.
if (!encryptionKeyIsValid()) {
  console.error(
    "[FATAL] ENCRYPTION_KEY manquante ou invalide (32 octets en base64 attendus). " +
      "Générer : openssl rand -base64 32"
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Derrière un reverse-proxy (HTTPS, IP réelle pour le rate-limiting)
app.set("trust proxy", 1);

// Middlewares de sécurité
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
// 2mb : suffisant pour un dessin (validé/plafonné séparément), limite l'abus mémoire
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/themes", adminThemesRouter);
app.use("/api/admin/sub-themes", adminSubThemesRouter);
app.use("/api/admin/quizzes", adminQuizzesRouter);
app.use("/api/admin/questions", adminQuestionsRouter);
app.use("/api/admin/tree", adminTreeRouter);
app.use("/api/admin/custom-paths", adminCustomPathsRouter);
app.use("/api/admin/revisions", adminRevisionsRouter);
app.use("/api/admin/stats", adminStatsRouter);
app.use("/api/admin/classes", adminClassesRouter);
app.use("/api/admin/shared-quizzes", adminSharedQuizzesRouter);
app.use("/api/admin/drawings", adminDrawingsRouter);
app.use("/api/student/themes", studentThemesRouter);
app.use("/api/student/quizzes", studentQuizzesRouter);
app.use("/api/student/custom-paths", studentCustomPathsRouter);
app.use("/api/student/revisions", studentRevisionsRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
