import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
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
import studentThemesRouter from "./routes/student/themes";
import studentQuizzesRouter from "./routes/student/quizzes";
import studentCustomPathsRouter from "./routes/student/customPaths";
import studentRevisionsRouter from "./routes/student/revisions";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" })); // 10mb pour supporter les dessins base64

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
