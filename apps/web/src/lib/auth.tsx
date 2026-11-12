/**
 * SupportDesk Authentication Context & State Management
 *
 * Implements:
 * - Approved sessionStorage JWT and User token persistence.
 * - In-memory React AuthContext for zero-flicker re-renders.
 * - Session restoration on page reload from sessionStorage.
 * - Global 401 handling via api-client onUnauthorized listener.
 * - Client-side logout only (wipes sessionStorage, resets context, and clears TanStack Query cache).
 *
 * NOTE ON SERVER-SIDE REVOCATION:
 * SupportDesk backend authentication uses stateless JWTs (expiresIn: "1d").
 * The Express backend does not maintain an active session table or token blocklist endpoint.
 * Therefore, client-side logout invalidates the local session only; the token remains
 * cryptographically valid until its 24-hour expiration timestamp.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type User,
  type AuthResult,
  type LoginInput,
  loginUser,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  onUnauthorized,
} from "./api-client";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (input: LoginInput) => Promise<AuthResult>;
  logout: () => void;
  clearSessionExpiredFlag: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  // Restore session from sessionStorage on initial mount
  useEffect(() => {
    try {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      } else {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      }
    } catch {
      clearStoredAuth();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Client-side logout implementation:
   * 1. Clears sessionStorage.
   * 2. Resets React authentication state.
   * 3. Wipes TanStack Query server cache to prevent cross-account cache leakage.
   * 4. Does NOT make a backend call (backend has no /logout endpoint).
   */
  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Subscribe to global 401 notifications on protected requests from api-client
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      logout();
      setSessionExpired(true);
    });
    return unsubscribe;
  }, [logout]);

  /**
   * Submits credentials through centralized API client, updates state and storage.
   */
  const login = useCallback(
    async (input: LoginInput): Promise<AuthResult> => {
      const auth = await loginUser(input);
      setStoredAuth(auth);
      setToken(auth.accessToken);
      setUser(auth.user);
      setSessionExpired(false);
      return auth;
    },
    []
  );

  const clearSessionExpiredFlag = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      sessionExpired,
      login,
      logout,
      clearSessionExpiredFlag,
    }),
    [user, token, isLoading, sessionExpired, login, logout, clearSessionExpiredFlag]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
