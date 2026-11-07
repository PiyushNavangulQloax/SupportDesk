export interface ApiResponse<T = unknown> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta: Record<string, unknown>;
}

export function successResponse<T>(
  data: T,
  meta: Record<string, unknown> = {}
): ApiResponse<T> {
  return {
    data,
    error: null,
    meta,
  };
}

export function errorResponse(
  message: string,
  code: string,
  details?: unknown,
  meta: Record<string, unknown> = {}
): ApiResponse<null> {
  return {
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta,
  };
}
