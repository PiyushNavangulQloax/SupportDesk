import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/lib/auth";
import { LoginPage } from "../src/pages/LoginPage";
import * as apiClient from "../src/lib/api-client";

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("LoginPage Component", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");
  });

  it("renders branding header, email input, password input, and submit button", () => {
    renderLoginPage();

    expect(screen.getByRole("heading", { name: /supportdesk/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i, { selector: "input" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in to supportdesk/i })
    ).toBeInTheDocument();
  });

  it("displays client-side validation errors for empty inputs", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const submitBtn = screen.getByRole("button", { name: /sign in to supportdesk/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Email address is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("displays validation error for malformed email address", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "not-an-email");

    const submitBtn = screen.getByRole("button", { name: /sign in to supportdesk/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });
  });

  it("accepts short passwords on login without enforcing an 8-character minimum (consistent with backend loginBodySchema)", async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(apiClient, "loginUser").mockResolvedValue({
      accessToken: "token-1",
      user: {
        id: "u-1",
        email: "test@supportdesk.com",
        name: "Test",
        role: "CUSTOMER",
        isActive: true,
        createdAt: "2026-11-06T04:36:16.000Z",
        updatedAt: "2026-11-06T04:36:16.000Z",
      },
    });

    renderLoginPage();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i, { selector: "input" });

    await user.type(emailInput, "valid@supportdesk.com");
    await user.type(passwordInput, "short"); // 5 characters

    const submitBtn = screen.getByRole("button", { name: /sign in to supportdesk/i });
    await user.click(submitBtn);

    await waitFor(() => {
      // Confirms form passed client validation and called the API
      expect(loginSpy).toHaveBeenCalledWith({
        email: "valid@supportdesk.com",
        password: "short",
      });
    });
  });

  it("toggles password visibility between password and text types", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText(/password/i, { selector: "input" });
    const toggleButton = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("displays server error message on 401 Unauthorized invalid credentials", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "loginUser").mockRejectedValue(
      new apiClient.ApiError(401, "UNAUTHORIZED", "Invalid email or password")
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), "unknown@supportdesk.com");
    await user.type(screen.getByLabelText(/password/i, { selector: "input" }), "WrongPass");
    await user.click(screen.getByRole("button", { name: /sign in to supportdesk/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });

  it("displays rate limiting message when backend responds with 429 TOO_MANY_REQUESTS", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "loginUser").mockRejectedValue(
      new apiClient.ApiError(
        429,
        "TOO_MANY_REQUESTS",
        "Too many login attempts from this IP, please try again after 15 minutes"
      )
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), "user@supportdesk.com");
    await user.type(screen.getByLabelText(/password/i, { selector: "input" }), "Pass123");
    await user.click(screen.getByRole("button", { name: /sign in to supportdesk/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/too many login attempts from this IP, please try again after 15 minutes/i)
      ).toBeInTheDocument();
    });
  });

  it("displays network error alert when server is offline", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "loginUser").mockRejectedValue(
      new apiClient.ApiError(
        0,
        "NETWORK_ERROR",
        "Network error: Unable to connect to SupportDesk API. Please check your connection or server status."
      )
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/email address/i), "user@supportdesk.com");
    await user.type(screen.getByLabelText(/password/i, { selector: "input" }), "Pass123");
    await user.click(screen.getByRole("button", { name: /sign in to supportdesk/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/unable to connect to supportdesk server/i)).toBeInTheDocument();
    });
  });
});
