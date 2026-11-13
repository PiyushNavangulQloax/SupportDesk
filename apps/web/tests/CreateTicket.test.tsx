import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/lib/auth";
import { CreateTicket } from "../src/features/tickets/components/CreateTicket";
import { CreateTicketPage } from "../src/pages/CreateTicketPage";
import * as ticketsApi from "../src/features/tickets/api/tickets.api";
import { ApiError } from "../src/lib/api-client";
import type { Ticket } from "../src/features/tickets/types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

const mockCreatedTicket: Ticket = {
  id: "ticket-new-999",
  title: "Database connection intermittent timeout",
  description: "Postgres database queries are timing out intermittently from app servers.",
  status: "OPEN",
  priority: "P2",
  category: "Technical",
  createdById: "cust-1",
  assigneeId: null,
  slaDueAt: null,
  createdAt: "2026-11-13T12:00:00.000Z",
  updatedAt: "2026-11-13T12:00:00.000Z",
  createdBy: {
    id: "cust-1",
    name: "Alex Customer",
    email: "alex@customer.com",
    role: "CUSTOMER",
  },
  assignee: null,
};

function renderCreateTicket({
  initialRoute = "/tickets/new",
  userRole = "CUSTOMER",
  queryClient = createTestQueryClient(),
  props = {},
} = {}) {
  // Set auth session in sessionStorage
  sessionStorage.setItem("supportdesk_access_token", "valid-test-token");
  sessionStorage.setItem(
    "supportdesk_user",
    JSON.stringify({
      id: "cust-1",
      name: "Alex Customer",
      email: "alex@customer.com",
      role: userRole,
    })
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/tickets/new" element={<CreateTicketPage />} />
            <Route
              path="/custom-create"
              element={<CreateTicket {...props} />}
            />
            <Route
              path="/tickets/:ticketId"
              element={<div data-testid="ticket-detail-view">Ticket Detail View</div>}
            />
            <Route
              path="/tickets"
              element={<div data-testid="tickets-list-view">Tickets List Screen</div>}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Create Ticket Screen & Submission Flow (Stage 4C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders create ticket form with title, priority, category, description, and action buttons", async () => {
    renderCreateTicket();

    // Header & Navigation
    expect(screen.getByRole("heading", { name: "Create Support Ticket" })).toBeInTheDocument();
    expect(screen.getByTestId("back-to-tickets-button")).toBeInTheDocument();

    // Form elements
    expect(screen.getByLabelText(/ticket title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();

    // Action buttons
    expect(screen.getByTestId("cancel-create-ticket-button")).toBeInTheDocument();
    expect(screen.getByTestId("submit-create-ticket-button")).toBeInTheDocument();

    // Context banner
    await waitFor(() => {
      expect(screen.getByText(/Logged in as Alex Customer \(CUSTOMER\)/i)).toBeInTheDocument();
    });
  });

  it("validates required fields on submission when fields are empty", async () => {
    renderCreateTicket();

    const submitBtn = screen.getByTestId("submit-create-ticket-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Title must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Description must be at least 5 characters/i)).toBeInTheDocument();
    });
  });

  it("rejects whitespace-only title and description and shows validation errors", async () => {
    renderCreateTicket();

    const titleInput = screen.getByTestId("ticket-title-input");
    const descTextarea = screen.getByTestId("ticket-description-textarea");
    const submitBtn = screen.getByTestId("submit-create-ticket-button");

    fireEvent.change(titleInput, { target: { value: "     " } });
    fireEvent.change(descTextarea, { target: { value: "        " } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Title must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Description must be at least 5 characters/i)).toBeInTheDocument();
    });
  });

  it("submits valid form payload to API and navigates to ticket detail page", async () => {
    const createSpy = vi.spyOn(ticketsApi, "createTicket").mockResolvedValueOnce(mockCreatedTicket);

    renderCreateTicket();

    const titleInput = screen.getByTestId("ticket-title-input");
    const prioritySelect = screen.getByTestId("ticket-priority-select");
    const categorySelect = screen.getByTestId("ticket-category-select");
    const descTextarea = screen.getByTestId("ticket-description-textarea");
    const submitBtn = screen.getByTestId("submit-create-ticket-button");

    fireEvent.change(titleInput, { target: { value: "Database connection intermittent timeout" } });
    fireEvent.change(prioritySelect, { target: { value: "P2" } });
    fireEvent.change(categorySelect, { target: { value: "Technical" } });
    fireEvent.change(descTextarea, {
      target: { value: "Postgres database queries are timing out intermittently from app servers." },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith({
        title: "Database connection intermittent timeout",
        priority: "P2",
        category: "Technical",
        description: "Postgres database queries are timing out intermittently from app servers.",
      });
    });

    // Verify navigation to /tickets/:ticketId
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });
  });

  it("omits category when left as empty selection", async () => {
    const createSpy = vi.spyOn(ticketsApi, "createTicket").mockResolvedValueOnce(mockCreatedTicket);

    renderCreateTicket();

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "General inquiry on account" } });
    fireEvent.change(screen.getByTestId("ticket-category-select"), { target: { value: "" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Need help understanding our latest invoice charges." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "General inquiry on account",
          description: "Need help understanding our latest invoice charges.",
          category: undefined,
        })
      );
    });
  });

  it("disables submit and cancel buttons and displays loading text while submitting", async () => {
    let resolvePromise: (value: Ticket) => void = () => {};
    const deferredPromise = new Promise<Ticket>((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(ticketsApi, "createTicket").mockReturnValueOnce(deferredPromise);

    renderCreateTicket();

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Server disk space warning" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Root partition on server prod-db-1 is at 92% capacity." },
    });

    const submitBtn = screen.getByTestId("submit-create-ticket-button");
    const cancelBtn = screen.getByTestId("cancel-create-ticket-button");

    fireEvent.click(submitBtn);

    // Assert loading state
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
      expect(screen.getByText("Creating Ticket...")).toBeInTheDocument();
    });

    // Resolve deferred promise
    resolvePromise(mockCreatedTicket);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });
  });

  it("displays server validation error (HTTP 400) in error banner", async () => {
    vi.spyOn(ticketsApi, "createTicket").mockRejectedValueOnce(
      new ApiError(400, "VALIDATION_ERROR", "Title violates policy terms")
    );

    renderCreateTicket();

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Invalid ticket title" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Some valid description for this issue." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-error-alert")).toBeInTheDocument();
      expect(screen.getByText("Title violates policy terms")).toBeInTheDocument();
    });
  });

  it("displays unauthorized error (HTTP 401) in error banner", async () => {
    vi.spyOn(ticketsApi, "createTicket").mockRejectedValueOnce(
      new ApiError(401, "UNAUTHORIZED", "Authentication required")
    );

    renderCreateTicket();

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Test ticket title" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Test ticket description content." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-error-alert")).toBeInTheDocument();
      expect(screen.getByText(/Your session has expired. Please sign in again./i)).toBeInTheDocument();
    });
  });

  it("displays forbidden error (HTTP 403) in error banner", async () => {
    vi.spyOn(ticketsApi, "createTicket").mockRejectedValueOnce(
      new ApiError(403, "FORBIDDEN", "Customers are not permitted to assign tickets to agents")
    );

    renderCreateTicket();

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Test ticket title" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Test ticket description content." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-error-alert")).toBeInTheDocument();
      expect(
        screen.getByText("Customers are not permitted to assign tickets to agents")
      ).toBeInTheDocument();
    });
  });

  it("displays network connection error when server is unreachable", async () => {
    vi.spyOn(ticketsApi, "createTicket").mockRejectedValueOnce(
      new ApiError(0, "NETWORK_ERROR", "Failed to fetch")
    );

    renderCreateTicket();

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Network test title" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Network test description." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-error-alert")).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to connect to the SupportDesk server/i)
      ).toBeInTheDocument();
    });
  });

  it("navigates back to tickets list when cancel button is clicked", async () => {
    renderCreateTicket();

    const cancelBtn = screen.getByTestId("cancel-create-ticket-button");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByTestId("tickets-list-view")).toBeInTheDocument();
    });
  });

  it("navigates back to tickets list when back-to-tickets link is clicked", async () => {
    renderCreateTicket();

    const backBtn = screen.getByTestId("back-to-tickets-button");
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByTestId("tickets-list-view")).toBeInTheDocument();
    });
  });

  it("calls custom onSuccess and onCancel callbacks when provided", async () => {
    const onSuccessSpy = vi.fn();
    const onCancelSpy = vi.fn();

    vi.spyOn(ticketsApi, "createTicket").mockResolvedValueOnce(mockCreatedTicket);

    renderCreateTicket({
      initialRoute: "/custom-create",
      props: {
        onSuccess: onSuccessSpy,
        onCancel: onCancelSpy,
      },
    });

    // Test onCancel callback
    fireEvent.click(screen.getByTestId("cancel-create-ticket-button"));
    expect(onCancelSpy).toHaveBeenCalledTimes(1);

    // Fill form and submit
    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Custom callback test" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Custom callback description." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(onSuccessSpy).toHaveBeenCalledTimes(1);
      expect(onSuccessSpy).toHaveBeenCalledWith(mockCreatedTicket);
    });
  });

  it("invalidates tickets list queries after successful creation", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.spyOn(ticketsApi, "createTicket").mockResolvedValueOnce(mockCreatedTicket);

    renderCreateTicket({ queryClient });

    fireEvent.change(screen.getByTestId("ticket-title-input"), { target: { value: "Query invalidation check" } });
    fireEvent.change(screen.getByTestId("ticket-description-textarea"), {
      target: { value: "Testing automatic ticket list cache invalidation." },
    });

    fireEvent.click(screen.getByTestId("submit-create-ticket-button"));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["tickets", "list"],
      });
    });
  });
});

