import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  apiRequest,
  loginUser,
  getApiBaseUrl,
  setStoredAuth,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  onUnauthorized,
  type AuthResult,
} from "../src/lib/api-client";

describe("SupportDesk API Client", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");
  });

  describe("Environment Configuration (VITE_API_BASE_URL)", () => {
    it("returns sanitized base URL when VITE_API_BASE_URL is set", () => {
      vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1///");
      expect(getApiBaseUrl()).toBe("http://localhost:5001/api/v1");
    });

    it("throws a fail-fast configuration error if VITE_API_BASE_URL is empty or missing", () => {
      vi.stubEnv("VITE_API_BASE_URL", "");
      expect(() => getApiBaseUrl()).toThrow(/Configuration Error: VITE_API_BASE_URL is missing/);
    });
  });

  describe("SessionStorage Token Management", () => {
    it("stores and retrieves token and user in sessionStorage", () => {
      const auth: AuthResult = {
        accessToken: "test-token-123",
        user: {
          id: "u-1",
          email: "alex@supportdesk.com",
          name: "Alex",
          role: "CUSTOMER",
          isActive: true,
          createdAt: "2026-11-06T04:36:16.000Z",
          updatedAt: "2026-11-06T04:36:16.000Z",
        },
      };

      setStoredAuth(auth);
      expect(getStoredToken()).toBe("test-token-123");
      expect(getStoredUser()).toEqual(auth.user);

      clearStoredAuth();
      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });
  });

  describe("Request Execution & Response Unboxing", () => {
    it("successfully unboxes { data, error, meta } envelope on 200 OK", async () => {
      const mockData = { id: "ticket-1", title: "Cannot reset password" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: mockData,
          error: null,
          meta: {},
        }),
      } as unknown as Response);

      const result = await apiRequest("/tickets/ticket-1");
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5001/api/v1/tickets/ticket-1",
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });

    it("injects Authorization: Bearer <token> when stored in sessionStorage", async () => {
      sessionStorage.setItem("supportdesk_access_token", "jwt-sample-token");

      global.fetch = vi.fn().mockImplementation((_url, init) => {
        const headers = init.headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer jwt-sample-token");
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ data: { ok: true }, error: null, meta: {} }),
        } as unknown as Response);
      });

      await apiRequest("/tickets");
    });

    it("throws ApiError with status 401 on invalid login without notifying session expiration", async () => {
      const unauthorizedCallback = vi.fn();
      const unsubscribe = onUnauthorized(unauthorizedCallback);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
          meta: {},
        }),
      } as unknown as Response);

      await expect(
        loginUser({ email: "wrong@supportdesk.com", password: "BadPassword" })
      ).rejects.toThrow("Invalid email or password");

      // On login 401, session expiry callback must NOT be triggered
      expect(unauthorizedCallback).not.toHaveBeenCalled();
      unsubscribe();
    });

    it("throws ApiError and notifies session expiration on 401 for protected endpoints", async () => {
      const unauthorizedCallback = vi.fn();
      const unsubscribe = onUnauthorized(unauthorizedCallback);
      sessionStorage.setItem("supportdesk_access_token", "expired-token");

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token",
          },
          meta: {},
        }),
      } as unknown as Response);

      await expect(apiRequest("/tickets")).rejects.toThrow("Invalid or expired token");

      // On protected endpoint 401, session expiry listener MUST be invoked
      expect(unauthorizedCallback).toHaveBeenCalledTimes(1);
      expect(getStoredToken()).toBeNull();
      unsubscribe();
    });

    it("throws ApiError with status 429 when rate limited", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: null,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many login attempts from this IP, please try again after 15 minutes",
          },
          meta: {},
        }),
      } as unknown as Response);

      await expect(
        loginUser({ email: "bot@attack.com", password: "Password123!" })
      ).rejects.toMatchObject({
        status: 429,
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts from this IP, please try again after 15 minutes",
      });
    });

    it("throws ApiError with code NETWORK_ERROR when fetch fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      await expect(apiRequest("/health")).rejects.toMatchObject({
        status: 0,
        code: "NETWORK_ERROR",
        message: expect.stringContaining("Unable to connect to SupportDesk API"),
      });
    });
  });
});
