import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketsPage } from "./pages/TicketsPage";
import { CreateTicketPage } from "./pages/CreateTicketPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { AppLayout } from "./components/layout/AppLayout";
import { Loader2 } from "lucide-react";

/**
 * Route guard component that protects authenticated pages.
 * - Displays an accessible loading spinner while restoring session.
 * - Redirects unauthenticated users to /login preserving the requested path.
 * - Renders children inside the AppLayout when authenticated.
 */
export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 gap-3"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        <span className="text-sm font-medium">Loading SupportDesk session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <AppLayout />;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes (wrapped with AppLayout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/new" element={<CreateTicketPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
