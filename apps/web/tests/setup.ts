import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup DOM after each test
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

// Configure default test environment variable
beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");
});
