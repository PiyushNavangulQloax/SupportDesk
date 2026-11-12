import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/lib/auth";
import { ProtectedRoute } from "../src/App";
import { LoginPage } from "../src/pages/LoginPage";
import { DashboardPage } from "../src/pages/DashboardPage";
import type { User } from "../src/lib/api-client";

function renderWithRouter(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProtectedRoute Guard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");
  });

  it("redirects unauthenticated users to /login when attempting to access protected route /", () => {
    renderWithRouter("/");

    // User should be redirected to login page
    expect(screen.getByRole("button", { name: /sign in to supportdesk/i })).toBeInTheDocument();
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
  });

  it("allows authenticated user to access protected route / and renders layout", () => {
    const mockUser: User = {
      id: "u-999",
      email: "alex@supportdesk.com",
      name: "Alex Rivera",
      role: "CUSTOMER",
      isActive: true,
      createdAt: "2026-11-06T04:36:16.000Z",
      updatedAt: "2026-11-06T04:36:16.000Z",
    };
    sessionStorage.setItem("supportdesk_access_token", "valid-jwt");
    sessionStorage.setItem("supportdesk_user", JSON.stringify(mockUser));

    renderWithRouter("/");

    // Should render Dashboard and Header with user name
    expect(screen.getByText(/welcome back, alex rivera!/i)).toBeInTheDocument();
    expect(screen.getAllByText("CUSTOMER").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
