import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ConfidentialitePage from "./pages/ConfidentialitePage";
import MentionsLegalesPage from "./pages/MentionsLegalesPage";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import SubThemesPage from "./pages/student/SubThemesPage";
import QuizzesPage from "./pages/student/QuizzesPage";
import AdminDashboard from "./pages/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import ContentPage from "./pages/admin/ContentPage";
import QuizPlayPage from "./pages/student/QuizPlayPage";
import CustomPathPage from "./pages/student/CustomPathPage";
import RevisionsPage from "./pages/admin/RevisionsPage";
import StatsPage from "./pages/admin/StatsPage";
import ClassesPage from "./pages/admin/ClassesPage";
import SharedWithMePage from "./pages/admin/SharedWithMePage";
import DrawingsPage from "./pages/admin/DrawingsPage";
import AuditPage from "./pages/admin/AuditPage";

function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/confidentialite" element={<ConfidentialitePage />} />
        <Route path="/mentions-legales" element={<MentionsLegalesPage />} />

        {/* Student routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/themes/:themeId"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <SubThemesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/themes/:themeId/sub-themes/:subThemeId"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <QuizzesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz/:quizId"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <QuizPlayPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/paths/:pathId"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <CustomPathPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/revisions/:revisionId"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <QuizPlayPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AuditPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/content"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <ContentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/revisions"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <RevisionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <StatsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <ClassesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/shared"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <SharedWithMePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/drawings"
          element={
            <ProtectedRoute requiredRole="STAFF">
              <DrawingsPage />
            </ProtectedRoute>
          }
        />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
