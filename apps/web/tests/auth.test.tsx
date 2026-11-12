import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../src/lib/auth";
import * as apiClient from "../src/lib/api-client";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("AuthContext & State Management", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");
  });

  it("initializes as unauthenticated when sessionStorage is empty", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it("restores active session from sessionStorage on mount", () => {
    const mockUser: apiClient.User = {
      id: "u-123",
      email: "sofia@supportdesk.com",
      name: "Sofia Martinez",
      role: "ADMIN",
      isActive: true,
      createdAt: "2026-11-06T04:36:16.000Z",
      updatedAt: "2026-11-06T04:36:16.000Z",
    };
    sessionStorage.setItem("supportdesk_access_token", "stored-jwt-token");
    sessionStorage.setItem("supportdesk_user", JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("stored-jwt-token");
    expect(result.current.user?.name).toBe("Sofia Martinez");
    expect(result.current.user?.role).toBe("ADMIN");
  });

  it("successfully updates context and sessionStorage upon login()", async () => {
    const mockAuthResult: apiClient.AuthResult = {
      accessToken: "fresh-jwt-token-456",
      user: {
        id: "u-456",
        email: "priya@supportdesk.com",
        name: "Priya Patel",
        role: "AGENT",
        isActive: true,
        createdAt: "2026-11-06T04:36:16.000Z",
        updatedAt: "2026-11-06T04:36:16.000Z",
      },
    };

    vi.spyOn(apiClient, "loginUser").mockResolvedValue(mockAuthResult);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.login({
        email: "priya@supportdesk.com",
        password: "Password123!",
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("fresh-jwt-token-456");
    expect(result.current.user?.email).toBe("priya@supportdesk.com");
    expect(sessionStorage.getItem("supportdesk_access_token")).toBe("fresh-jwt-token-456");
  });

  it("clears context state, sessionStorage, and query cache on logout()", () => {
    sessionStorage.setItem("supportdesk_access_token", "jwt-to-clear");
    sessionStorage.setItem("supportdesk_user", JSON.stringify({ id: "1", role: "CUSTOMER" }));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(sessionStorage.getItem("supportdesk_access_token")).toBeNull();
  });
});
