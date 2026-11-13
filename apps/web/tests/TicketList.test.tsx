import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TicketList } from "../src/features/tickets/components/TicketList";
import * as ticketsApi from "../src/features/tickets/api/tickets.api";
import type { Ticket, PaginatedTicketsResponse } from "../src/features/tickets/types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

const mockTickets: Ticket[] = [
  {
    id: "ticket-1",
    title: "Cannot access VPN server",
    description: "Gateway timeout when connecting to EU region",
    status: "OPEN",
    priority: "P1",
    category: "Network",
    createdById: "user-1",
    assigneeId: "agent-1",
    slaDueAt: "2026-11-20T00:00:00.000Z",
    createdAt: "2026-11-12T10:00:00.000Z",
    updatedAt: "2026-11-12T10:00:00.000Z",
    assignee: {
      id: "agent-1",
      name: "Sam Agent",
      email: "sam@supportdesk.com",
    },
  },
  {
    id: "ticket-2",
    title: "Request for Figma license",
    description: "Need Figma editor access for UI redesign",
    status: "IN_PROGRESS",
    priority: "P3",
    category: "Software",
    createdById: "user-2",
    assigneeId: null,
    slaDueAt: null,
    createdAt: "2026-11-11T12:00:00.000Z",
    updatedAt: "2026-11-11T12:00:00.000Z",
    assignee: null,
  },
  {
    id: "ticket-3",
    title: "Laptop screen flickering",
    description: "External monitor is fine, internal screen flickers",
    status: "RESOLVED",
    priority: "P2",
    category: null,
    createdById: "user-1",
    assigneeId: "agent-2",
    slaDueAt: null,
    createdAt: "2026-11-10T09:00:00.000Z",
    updatedAt: "2026-11-10T15:00:00.000Z",
    assignee: {
      id: "agent-2",
      name: "Taylor Tech",
      email: "taylor@supportdesk.com",
    },
  },
];

function renderTicketList(initialRoute = "/tickets") {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/tickets" element={<TicketList pageSize={10} />} />
          <Route
            path="/tickets/:id"
            element={<div data-testid="ticket-detail-view">Ticket Detail Route</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TicketList Screen (Stage 4A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Initial loading state
  it("renders accessible loading indicator while fetching tickets", () => {
    vi.spyOn(ticketsApi, "listTickets").mockReturnValue(new Promise(() => {}));

    renderTicketList();

    expect(screen.getByTestId("ticket-list-loading")).toBeInTheDocument();
    expect(screen.getByText(/loading tickets\.\.\./i)).toBeInTheDocument();
  });

  // 2. Ticket list rendering with data (both desktop table and mobile cards)
  it("renders tickets with title, status, priority, category, assignee, and dates", async () => {
    const mockResponse: PaginatedTicketsResponse = {
      tickets: mockTickets,
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      },
    };

    vi.spyOn(ticketsApi, "listTickets").mockResolvedValue(mockResponse);

    renderTicketList();

    // Verify tickets appear in table
    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    const table = screen.getByTestId("ticket-table");
    expect(within(table).getByText("Cannot access VPN server")).toBeInTheDocument();
    expect(within(table).getByText("Request for Figma license")).toBeInTheDocument();
    expect(within(table).getByText("Laptop screen flickering")).toBeInTheDocument();

    // Verify status badges
    expect(within(table).getByTestId("status-badge-open")).toBeInTheDocument();
    expect(within(table).getByTestId("status-badge-in_progress")).toBeInTheDocument();
    expect(within(table).getByTestId("status-badge-resolved")).toBeInTheDocument();

    // Verify priority badges
    expect(within(table).getByTestId("priority-badge-p1")).toBeInTheDocument();
    expect(within(table).getByTestId("priority-badge-p3")).toBeInTheDocument();
    expect(within(table).getByTestId("priority-badge-p2")).toBeInTheDocument();

    // Verify categories
    expect(within(table).getByText("Network")).toBeInTheDocument();
    expect(within(table).getByText("Software")).toBeInTheDocument();

    // Verify assignees: Sam Agent, Taylor Tech, and Unassigned
    expect(within(table).getByText("Sam Agent")).toBeInTheDocument();
    expect(within(table).getByText("Taylor Tech")).toBeInTheDocument();
    expect(within(table).getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);

    // Verify mobile card view is also rendered
    expect(screen.getByTestId("ticket-card-ticket-1")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("ticket-card-ticket-1")).getByText("Cannot access VPN server")
    ).toBeInTheDocument();

    // Verify pagination summary
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  // 3. Empty state when no tickets exist
  it("renders empty state when no tickets are present and no filters active", async () => {
    vi.spyOn(ticketsApi, "listTickets").mockResolvedValue({
      tickets: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-list-empty")).toBeInTheDocument();
    });

    expect(screen.getByText("No tickets found")).toBeInTheDocument();
    expect(
      screen.getByText("There are currently no support tickets to display.")
    ).toBeInTheDocument();
  });

  // 4. No-results state when filters return 0 tickets
  it("renders no-results state with clear-filters action when active filters return empty", async () => {
    const listSpy = vi
      .spyOn(ticketsApi, "listTickets")
      .mockResolvedValueOnce({
        tickets: mockTickets,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        tickets: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    // Enter search filter
    const searchInput = screen.getByTestId("ticket-search-input");
    fireEvent.change(searchInput, { target: { value: "NonExistentQuery" } });
    fireEvent.click(screen.getByTestId("ticket-search-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-list-no-results")).toBeInTheDocument();
    });

    expect(screen.getByText("No matching tickets")).toBeInTheDocument();

    // Click "Clear all filters" button in empty state
    listSpy.mockResolvedValueOnce({
      tickets: mockTickets,
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
    });

    fireEvent.click(screen.getByTestId("ticket-no-results-clear"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });
  });

  // 5. Error state with retry action
  it("renders error state when API fails and allows retrying", async () => {
    const listSpy = vi
      .spyOn(ticketsApi, "listTickets")
      .mockRejectedValueOnce(new Error("Database connection lost"))
      .mockResolvedValueOnce({
        tickets: mockTickets,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-list-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Database connection lost")).toBeInTheDocument();

    // Click "Try again"
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  // 6. Search filter submission
  it("applies search query and resets pagination to page 1", async () => {
    const listSpy = vi.spyOn(ticketsApi, "listTickets").mockResolvedValue({
      tickets: [mockTickets[0]],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    // Search for "VPN"
    const searchInput = screen.getByTestId("ticket-search-input");
    fireEvent.change(searchInput, { target: { value: "VPN" } });
    fireEvent.click(screen.getByTestId("ticket-search-submit"));

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          search: "VPN",
        })
      );
    });
  });

  // 7. Status and priority filtering
  it("applies status and priority dropdown filters", async () => {
    const listSpy = vi.spyOn(ticketsApi, "listTickets").mockResolvedValue({
      tickets: [mockTickets[0]],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    // Filter by status "OPEN"
    const statusSelect = screen.getByTestId("ticket-status-filter");
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: "OPEN",
          page: 1,
        })
      );
    });

    // Filter by priority "P1"
    const prioritySelect = screen.getByTestId("ticket-priority-filter");
    fireEvent.change(prioritySelect, { target: { value: "P1" } });

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: "OPEN",
          priority: "P1",
          page: 1,
        })
      );
    });
  });

  // 8. Pagination controls and server page fetching
  it("handles pagination navigation and disables boundary buttons", async () => {
    const listSpy = vi
      .spyOn(ticketsApi, "listTickets")
      .mockResolvedValueOnce({
        tickets: [mockTickets[0]],
        pagination: { page: 1, limit: 10, total: 15, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        tickets: [mockTickets[1]],
        pagination: { page: 2, limit: 10, total: 15, totalPages: 2 },
      });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    const prevBtn = screen.getByTestId("ticket-pagination-prev");
    const nextBtn = screen.getByTestId("ticket-pagination-next");

    // Previous is disabled on page 1
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Click Next
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  // 9. Changing filter on later page resets page to 1
  it("resets page to 1 when status filter changes from page 2", async () => {
    const listSpy = vi
      .spyOn(ticketsApi, "listTickets")
      .mockResolvedValueOnce({
        tickets: [mockTickets[0]],
        pagination: { page: 1, limit: 10, total: 20, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        tickets: [mockTickets[1]],
        pagination: { page: 2, limit: 10, total: 20, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        tickets: [mockTickets[0]],
        pagination: { page: 1, limit: 10, total: 5, totalPages: 1 },
      });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    // Go to page 2
    fireEvent.click(screen.getByTestId("ticket-pagination-next"));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    // Now change status filter while on page 2
    const statusSelect = screen.getByTestId("ticket-status-filter");
    fireEvent.change(statusSelect, { target: { value: "IN_PROGRESS" } });

    // Should fetch page 1 with IN_PROGRESS
    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          status: "IN_PROGRESS",
        })
      );
    });
  });

  // 10. Clear filters action
  it("resets all active filters and restores page 1 when clear-filters is clicked", async () => {
    const listSpy = vi.spyOn(ticketsApi, "listTickets").mockResolvedValue({
      tickets: mockTickets,
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
    });

    // Set a status filter
    const statusSelect = screen.getByTestId("ticket-status-filter");
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(screen.getByTestId("ticket-clear-filters")).toBeInTheDocument();
    });

    // Click "Clear filters" in filter toolbar
    fireEvent.click(screen.getByTestId("ticket-clear-filters"));

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
      });
    });

    // Clear filters button disappears when no filters are active
    expect(screen.queryByTestId("ticket-clear-filters")).not.toBeInTheDocument();
  });

  // 11. Ticket navigation to detail route
  it("navigates to /tickets/:id when clicking on ticket title or row", async () => {
    vi.spyOn(ticketsApi, "listTickets").mockResolvedValue({
      tickets: [mockTickets[0]],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderTicketList();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-title-ticket-1")).toBeInTheDocument();
    });

    // Click ticket row
    fireEvent.click(screen.getByTestId("ticket-row-ticket-1"));

    // Router should navigate to detail route
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });
  });
});

