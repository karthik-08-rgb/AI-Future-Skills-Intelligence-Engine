import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout, FullPageSpinner } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FutureSkillsPage } from "./pages/FutureSkillsPage";
import { DecliningSkillsPage } from "./pages/DecliningSkillsPage";
import { ReskillingPage } from "./pages/ReskillingPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { RecommendationDetailPage } from "./pages/RecommendationDetailPage";
import { RoleDetailPage } from "./pages/RoleDetailPage";
import { ProcessDetailPage } from "./pages/ProcessDetailPage";
import { AssistantPage } from "./pages/AssistantPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { ImportPage } from "./pages/ImportPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import type { ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <RegisterPage />
              </PublicOnly>
            }
          />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/future-skills" element={<FutureSkillsPage />} />
            <Route path="/declining-skills" element={<DecliningSkillsPage />} />
            <Route path="/reskilling" element={<ReskillingPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/recommendations/:id" element={<RecommendationDetailPage />} />
            <Route path="/roles/:id" element={<RoleDetailPage />} />
            <Route path="/processes/:id" element={<ProcessDetailPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
