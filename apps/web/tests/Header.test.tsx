import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../src/components/layout/Header";
import * as authModule from "../src/lib/auth";

vi.mock("../src/lib/auth", () => ({
  useAuth: vi.fn(),
}));

describe("Header Component Integration (Step 4A)", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user information, shared Avatar, and RoleBadge for authenticated user", () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: {
        id: "usr-admin-1",
        name: "Sofia Admin",
        email: "sofia.admin@supportdesk.internal",
        role: "ADMIN",
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
      token: "mock-token",
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false,
      login: vi.fn(),
      logout: mockLogout,
      clearSessionExpiredFlag: vi.fn(),
    });

    render(<Header />);

    // Brand portal heading
    expect(screen.getByText("SupportDesk Portal")).toBeInTheDocument();

    // User name and email
    expect(screen.getByText("Sofia Admin")).toBeInTheDocument();
    expect(screen.getByText("sofia.admin@supportdesk.internal")).toBeInTheDocument();

    // Shared Avatar renders initials "SA"
    const avatar = screen.getByLabelText("Sofia Admin's avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent("SA");
    // Admin avatar background class
    expect(avatar).toHaveClass("bg-purple-100", "text-purple-700");

    // Shared RoleBadge renders ADMIN badge with shield icon
    const roleBadge = screen.getByTestId("role-badge-admin");
    expect(roleBadge).toBeInTheDocument();
    expect(roleBadge).toHaveTextContent("ADMIN");
    expect(roleBadge).toHaveClass("bg-purple-100", "text-purple-800");

    // Sign out button with accessible name for mobile screen readers
    const signOutBtn = screen.getByRole("button", { name: "Sign out of SupportDesk" });
    expect(signOutBtn).toBeInTheDocument();
    expect(signOutBtn).toHaveAttribute("aria-label", "Sign out of SupportDesk");
    expect(signOutBtn).toHaveAttribute("title", "Sign out of SupportDesk");
    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("renders AGENT role badge with appropriate styling", () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: {
        id: "usr-agent-1",
        name: "Priya Kapoor",
        email: "priya.kapoor@supportdesk.internal",
        role: "AGENT",
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
      token: "mock-token",
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false,
      login: vi.fn(),
      logout: mockLogout,
      clearSessionExpiredFlag: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("Priya Kapoor")).toBeInTheDocument();
    const avatar = screen.getByLabelText("Priya Kapoor's avatar");
    expect(avatar).toHaveTextContent("PK");
    expect(avatar).toHaveClass("bg-blue-100", "text-blue-700");

    const roleBadge = screen.getByTestId("role-badge-agent");
    expect(roleBadge).toBeInTheDocument();
    expect(roleBadge).toHaveTextContent("AGENT");
    expect(roleBadge).toHaveClass("bg-brand-50", "text-brand-700");
  });

  it("renders CUSTOMER role badge with appropriate styling", () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: {
        id: "usr-cust-1",
        name: "Alice Moreau",
        email: "alice.moreau@example.com",
        role: "CUSTOMER",
        isActive: true,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
      token: "mock-token",
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false,
      login: vi.fn(),
      logout: mockLogout,
      clearSessionExpiredFlag: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("Alice Moreau")).toBeInTheDocument();
    const avatar = screen.getByLabelText("Alice Moreau's avatar");
    expect(avatar).toHaveTextContent("AM");
    expect(avatar).toHaveClass("bg-emerald-100", "text-emerald-700");

    const roleBadge = screen.getByTestId("role-badge-customer");
    expect(roleBadge).toBeInTheDocument();
    expect(roleBadge).toHaveTextContent("CUSTOMER");
    expect(roleBadge).toHaveClass("bg-emerald-50", "text-emerald-700");
  });

  it("invokes onToggleSidebar when mobile hamburger button is clicked", () => {
    const handleToggle = vi.fn();
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false,
      login: vi.fn(),
      logout: mockLogout,
      clearSessionExpiredFlag: vi.fn(),
    });

    render(<Header onToggleSidebar={handleToggle} />);

    const sidebarToggleBtn = screen.getByRole("button", { name: /open sidebar/i });
    expect(sidebarToggleBtn).toBeInTheDocument();
    fireEvent.click(sidebarToggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("does not render sidebar toggle button when onToggleSidebar is not provided", () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false,
      login: vi.fn(),
      logout: mockLogout,
      clearSessionExpiredFlag: vi.fn(),
    });

    render(<Header />);

    expect(screen.queryByRole("button", { name: /open sidebar/i })).not.toBeInTheDocument();
  });
});
