import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/lib/auth";
import { TicketDetailPage } from "../src/pages/TicketDetailPage";
import * as ticketsApi from "../src/features/tickets/api/tickets.api";
import { ApiError } from "../src/lib/api-client";
import type { Ticket, Comment } from "../src/features/tickets/types";

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

const mockTicket: Ticket = {
  id: "ticket-123",
  title: "VPN Gateway Connection Timeout",
  description: "Unable to connect to the EU-Central-1 gateway from company laptop. Error code 0x80070035.",
  status: "IN_PROGRESS",
  priority: "P1",
  category: "Network Infrastructure",
  createdById: "cust-1",
  assigneeId: "agent-1",
  slaDueAt: "2026-11-20T18:00:00.000Z",
  createdAt: "2026-11-12T08:30:00.000Z",
  updatedAt: "2026-11-12T14:45:00.000Z",
  createdBy: {
    id: "cust-1",
    name: "Alex Customer",
    email: "alex@customer.com",
    role: "CUSTOMER",
  },
  assignee: {
    id: "agent-1",
    name: "Sarah Support",
    email: "sarah@supportdesk.internal",
    role: "AGENT",
  },
};

const mockComments: Comment[] = [
  {
    id: "comment-1",
    ticketId: "ticket-123",
    authorId: "cust-1",
    body: "I am still seeing the gateway timeout on my machine.",
    isInternal: false,
    createdAt: "2026-11-12T09:00:00.000Z",
    author: {
      id: "cust-1",
      name: "Alex Customer",
      email: "alex@customer.com",
      role: "CUSTOMER",
    },
  },
  {
    id: "comment-2",
    ticketId: "ticket-123",
    authorId: "agent-1",
    body: "Checking firewall rules on gateway node 3.",
    isInternal: true,
    createdAt: "2026-11-12T10:15:00.000Z",
    author: {
      id: "agent-1",
      name: "Sarah Support",
      email: "sarah@supportdesk.internal",
      role: "AGENT",
    },
  },
];

function renderTicketDetail(initialRoute = "/tickets/ticket-123", userRole = "AGENT") {
  const queryClient = createTestQueryClient();

  // Set auth session
  sessionStorage.setItem("supportdesk_access_token", "valid-test-token");
  sessionStorage.setItem(
    "supportdesk_user",
    JSON.stringify({
      id: userRole === "CUSTOMER" ? "cust-1" : "agent-1",
      name: userRole === "CUSTOMER" ? "Alex Customer" : "Sarah Support",
      email: userRole === "CUSTOMER" ? "alex@customer.com" : "sarah@supportdesk.internal",
      role: userRole,
    })
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/tickets" element={<div data-testid="tickets-list-view">Tickets List Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TicketDetailPage Screen (Stage 4B)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");
  });

  // 1. Initial loading state
  it("renders accessible loading indicator while fetching ticket details", () => {
    vi.spyOn(ticketsApi, "getTicketById").mockReturnValue(new Promise(() => {}));
    vi.spyOn(ticketsApi, "listComments").mockReturnValue(new Promise(() => {}));

    renderTicketDetail();

    expect(screen.getByTestId("ticket-detail-loading")).toBeInTheDocument();
    expect(screen.getByText(/loading ticket details\.\.\./i)).toBeInTheDocument();
  });

  // 2. Ticket information rendering
  it("renders ticket title, description, status, priority, category, assignee, requester, and timestamps", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue(mockComments);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-title")).toHaveTextContent("VPN Gateway Connection Timeout");
    });

    expect(screen.getByTestId("ticket-description")).toHaveTextContent(
      "Unable to connect to the EU-Central-1 gateway from company laptop."
    );
    expect(screen.getByTestId("ticket-id-display")).toHaveTextContent("ID: ticket-123");

    // Badges (rendered in main header and sidebar overview)
    expect(screen.getAllByTestId("status-badge-in_progress").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("priority-badge-p1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Network Infrastructure").length).toBeGreaterThanOrEqual(1);

    // Sidebar people details
    const sidebar = screen.getByTestId("ticket-sidebar");
    expect(within(sidebar).getByText("Alex Customer")).toBeInTheDocument();
    expect(within(sidebar).getByText("alex@customer.com")).toBeInTheDocument();
    expect(within(sidebar).getByText("Sarah Support")).toBeInTheDocument();
    expect(within(sidebar).getByText("sarah@supportdesk.internal")).toBeInTheDocument();

    // Timestamps
    expect(screen.getByTestId("ticket-created-at")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-updated-at")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-sla-due")).toBeInTheDocument();
  });

  // 3. Ticket 404 Not Found state
  it("renders not-found state when backend returns 404 error", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Ticket not found")
    );
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-not-found")).toBeInTheDocument();
    });

    expect(screen.getByText("Ticket Not Found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to tickets list/i })).toBeInTheDocument();
  });

  // 4. Ticket API failure and retry
  it("renders error state on API failure and retries on button click", async () => {
    const getTicketSpy = vi
      .spyOn(ticketsApi, "getTicketById")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Network timeout")).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-title")).toHaveTextContent("VPN Gateway Connection Timeout");
    });

    expect(getTicketSpy).toHaveBeenCalledTimes(2);
  });

  // 5. Comments thread rendering
  it("renders conversation history with author names, roles, timestamps, and internal note styling", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue(mockComments);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("comments-count-badge")).toHaveTextContent("2");
    });

    // Verify comment 1 (Customer public response)
    expect(
      screen.getByText("I am still seeing the gateway timeout on my machine.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("comment-role-customer")).toBeInTheDocument();

    // Verify comment 2 (Agent internal note)
    expect(
      screen.getByText("Checking firewall rules on gateway node 3.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("internal-note-badge")).toBeInTheDocument();
  });

  // 6. Empty comments state
  it("renders empty comments message when ticket has 0 comments", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("comments-empty")).toBeInTheDocument();
    });

    expect(screen.getByText("No comments yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start the conversation by posting a reply below.")
    ).toBeInTheDocument();
  });

  // 7. Comment submission success
  it("submits a new comment, clears textarea, and invalidates comments cache", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    const listCommentsSpy = vi
      .spyOn(ticketsApi, "listComments")
      .mockResolvedValueOnce(mockComments)
      .mockResolvedValueOnce([
        ...mockComments,
        {
          id: "comment-3",
          ticketId: "ticket-123",
          authorId: "agent-1",
          body: "Gateway service successfully restarted.",
          isInternal: false,
          createdAt: "2026-11-12T12:00:00.000Z",
          author: {
            id: "agent-1",
            name: "Sarah Support",
            email: "sarah@supportdesk.internal",
            role: "AGENT",
          },
        },
      ]);

    const createCommentSpy = vi.spyOn(ticketsApi, "createComment").mockResolvedValue({
      id: "comment-3",
      ticketId: "ticket-123",
      authorId: "agent-1",
      body: "Gateway service successfully restarted.",
      isInternal: false,
      createdAt: "2026-11-12T12:00:00.000Z",
      author: {
        id: "agent-1",
        name: "Sarah Support",
        email: "sarah@supportdesk.internal",
        role: "AGENT",
      },
    });

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
    });

    // Enter comment text
    const textarea = screen.getByTestId("comment-textarea");
    fireEvent.change(textarea, { target: { value: "Gateway service successfully restarted." } });

    // Submit response
    const submitBtn = screen.getByTestId("comment-submit-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createCommentSpy).toHaveBeenCalledWith("ticket-123", {
        body: "Gateway service successfully restarted.",
        isInternal: false,
      });
    });

    // Textarea cleared
    expect(textarea).toHaveValue("");

    // Cache refreshed and new comment appears
    await waitFor(() => {
      expect(screen.getByText("Gateway service successfully restarted.")).toBeInTheDocument();
    });

    expect(listCommentsSpy).toHaveBeenCalledTimes(2);
  });

  // 8. Empty comment validation
  it("prevents submitting whitespace-only comments and displays error", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);
    const createCommentSpy = vi.spyOn(ticketsApi, "createComment");

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    fireEvent.change(textarea, { target: { value: "    " } });

    // The button is disabled when trimmed value is empty
    const submitBtn = screen.getByTestId("comment-submit-btn");
    expect(submitBtn).toBeDisabled();

    // Trigger submit via form
    fireEvent.submit(screen.getByTestId("add-comment-form"));

    expect(createCommentSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Comment cannot be empty")).toBeInTheDocument();
  });

  // 9. API submission failure handling
  it("displays server error message when comment creation fails", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);
    vi.spyOn(ticketsApi, "createComment").mockRejectedValue(
      new Error("Failed to post comment to database")
    );

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("comment-textarea");
    fireEvent.change(textarea, { target: { value: "Test response text" } });

    fireEvent.click(screen.getByTestId("comment-submit-btn"));

    await waitFor(() => {
      expect(screen.getByText("Failed to post comment to database")).toBeInTheDocument();
    });

    // Content is preserved on failure
    expect(textarea).toHaveValue("Test response text");
  });

  // 10. Role-based internal note permission enforcement
  it("shows internal note toggle for AGENT role but hides it for CUSTOMER role", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);

    // 1. As AGENT: internal note toggle is visible
    const { unmount } = renderTicketDetail("/tickets/ticket-123", "AGENT");

    await waitFor(() => {
      expect(screen.getByTestId("comment-internal-toggle")).toBeInTheDocument();
    });

    unmount();

    // 2. As CUSTOMER: internal note toggle is hidden
    renderTicketDetail("/tickets/ticket-123", "CUSTOMER");

    await waitFor(() => {
      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("comment-internal-toggle")).not.toBeInTheDocument();
  });

  // 11. Navigation back to tickets list
  it("navigates back to /tickets when back link is clicked", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([]);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByTestId("back-to-tickets-link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("back-to-tickets-link"));

    await waitFor(() => {
      expect(screen.getByTestId("tickets-list-view")).toBeInTheDocument();
    });
  });
});
