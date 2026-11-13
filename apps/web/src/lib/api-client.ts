/**
 * SupportDesk Centralized API Client
 *
 * Implements native Fetch API wrapper with:
 * - Strict environment variable enforcement (VITE_API_BASE_URL).
 * - Centralized Bearer token injection from approved sessionStorage.
 * - Standard backend { data, error, meta } envelope unboxing.
 * - Typed ApiError handling with status, error code, and details.
 * - Distinct handling for login 401 vs. expired session 401.
 */

export type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface BackendErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: BackendErrorPayload | null;
  meta: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Retrieves and validates the API base URL from Vite environment.
 * Throws a fail-fast configuration error if missing or blank.
 */
export function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new Error(
      "Configuration Error: VITE_API_BASE_URL is missing. " +
        "Please define VITE_API_BASE_URL in your apps/web/.env file (e.g., http://localhost:5001/api/v1)."
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

// Session storage key for JWT token
export const TOKEN_STORAGE_KEY = "supportdesk_access_token";
export const USER_STORAGE_KEY = "supportdesk_user";

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: AuthResult): void {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, auth.accessToken);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(auth.user));
  } catch {
    // SessionStorage quota exceeded or disabled
  }
}

export function clearStoredAuth(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// Listener callback for session expiration (401 on protected requests)
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("Error executing unauthorized listener", err);
    }
  });
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
}

async function executeRequest<T>(
  endpoint: string,
  options: RequestOptions
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  // Determine token: explicit override, or from approved sessionStorage unless skipAuth is true
  if (!options.skipAuth) {
    const activeToken = options.token !== undefined ? options.token : getStoredToken();
    if (activeToken) {
      headers.set("Authorization", `Bearer ${activeToken}`);
    }
  }

  let body: BodyInit | undefined = undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (err) {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Network error: Unable to connect to SupportDesk API. Please check your connection or server status.",
      err
    );
  }

  let payload: ApiResponse<T> | null = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  // Handle HTTP error responses
  if (!response.ok) {
    const status = response.status;
    const errorCode = payload?.error?.code || `HTTP_${status}`;
    const errorMessage =
      payload?.error?.message || response.statusText || "An unexpected error occurred";
    const details = payload?.error?.details;

    // Distinguish login 401 from expired session 401 on protected requests
    const isLoginEndpoint = normalizedEndpoint === "/auth/login";
    if (status === 401 && !isLoginEndpoint) {
      clearStoredAuth();
      notifyUnauthorized();
    }

    throw new ApiError(status, errorCode, errorMessage, details);
  }

  return (
    payload || {
      data: null,
      error: null,
      meta: {},
    }
  );
}

/**
 * Core centralized request method using native Fetch API, returning unboxed data.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const payload = await executeRequest<T>(endpoint, options);

  // Success path: return unboxed data property
  if (payload && payload.data !== null && payload.data !== undefined) {
    return payload.data;
  }

  return null as unknown as T;
}

/**
 * Request method returning both data and metadata envelope (e.g. for paginated results).
 */
export async function apiRequestWithMeta<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const payload = await executeRequest<T>(endpoint, options);
  return {
    data: (payload?.data !== null && payload?.data !== undefined ? payload.data : null) as T,
    meta: payload?.meta || {},
  };
}

/**
 * Dedicated auth API calls kept strictly outside UI components.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    body: input,
    skipAuth: true,
  });

  if (!result || !result.accessToken || !result.user) {
    throw new ApiError(
      500,
      "INVALID_RESPONSE",
      "Malformed response received from login endpoint."
    );
  }

  return result;
}
