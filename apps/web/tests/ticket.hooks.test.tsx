import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ticketKeys,
  commentKeys,
  useTickets,
  useTicket,
  useCreateTicket,
  useUpdateTicket,
  useComments,
  useCreateComment,
} from "../src/features/tickets/hooks";
import * as ticketsApi from "../src/features/tickets/api/tickets.api";
import type { Ticket, Comment, PaginatedTicketsResponse } from "../src/features/tickets/types";
import { ApiError } from "../src/lib/api-client";

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockTicket: Ticket = {
  id: "ticket-101",
  title: "Printer broken",
  description: "Paper jam error",
  status: "OPEN",
  priority: "P2",
  category: "Hardware",
  createdById: "user-1",
  assigneeId: null,
  slaDueAt: null,
  createdAt: "2026-11-12T00:00:00.000Z",
  updatedAt: "2026-11-12T00:00:00.000Z",
};

const mockComment: Comment = {
  id: "comment-201",
  ticketId: "ticket-101",
  authorId: "agent-1",
  body: "Investigating the hardware issue",
  isInternal: false,
  createdAt: "2026-11-12T01:00:00.000Z",
};

describe("TanStack Query Hooks for Tickets & Comments", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // 1. Ticket list query success
  it("useTickets fetches paginated tickets successfully", async () => {
    const mockResponse: PaginatedTicketsResponse = {
      tickets: [mockTicket],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    vi.spyOn(ticketsApi, "listTickets").mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useTickets({ status: "OPEN" }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.tickets).toHaveLength(1);
    expect(result.current.data?.tickets[0].id).toBe("ticket-101");
    expect(result.current.data?.pagination.total).toBe(1);
  });

  // 2. Ticket list query error
  it("useTickets handles API error propagation", async () => {
    vi.spyOn(ticketsApi, "listTickets").mockRejectedValue(
      new ApiError(500, "INTERNAL_ERROR", "Server database error")
    );

    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.message).toBe("Server database error");
  });

  // 3. Different filters produce different query keys
  it("query key factory produces distinct keys for different filters and pagination", () => {
    const keyOpen = ticketKeys.list({ status: "OPEN" });
    const keyClosed = ticketKeys.list({ status: "CLOSED" });
    const keyPage2 = ticketKeys.list({ page: 2 });
    const keyEmpty = ticketKeys.list();

    expect(keyOpen).toEqual(["tickets", "list", { status: "OPEN" }]);
    expect(keyClosed).toEqual(["tickets", "list", { status: "CLOSED" }]);
    expect(keyPage2).toEqual(["tickets", "list", { page: 2 }]);
    expect(keyEmpty).toEqual(["tickets", "list", {}]);

    expect(JSON.stringify(keyOpen)).not.toBe(JSON.stringify(keyClosed));
    expect(JSON.stringify(keyOpen)).not.toBe(JSON.stringify(keyPage2));
  });

  // 4. Ticket detail query success
  it("useTicket fetches a single ticket successfully by ID", async () => {
    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);

    const { result } = renderHook(() => useTicket("ticket-101"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("ticket-101");
    expect(result.current.data?.title).toBe("Printer broken");
  });

  // 5. Missing ticket ID disables fetching
  it("useTicket is disabled when ticket ID is null, undefined, or empty", () => {
    const fetchSpy = vi.spyOn(ticketsApi, "getTicketById");

    const { result: rNull } = renderHook(() => useTicket(null), {
      wrapper: createWrapper(queryClient),
    });
    expect(rNull.current.fetchStatus).toBe("idle");
    expect(rNull.current.isLoading).toBe(false);

    const { result: rEmpty } = renderHook(() => useTicket("   "), {
      wrapper: createWrapper(queryClient),
    });
    expect(rEmpty.current.fetchStatus).toBe("idle");
    expect(rEmpty.current.isLoading).toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 6. Create-ticket mutation success and list invalidation
  it("useCreateTicket creates ticket and invalidates ticket lists", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(ticketsApi, "createTicket").mockResolvedValue(mockTicket);

    const { result } = renderHook(() => useCreateTicket(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      title: "New ticket",
      description: "Description here",
      priority: "P3",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ticketKeys.lists(),
    });
  });

  // 7. Update-ticket mutation success and correct invalidation
  it("useUpdateTicket updates ticket, updates detail cache, and invalidates lists", async () => {
    const updatedTicket: Ticket = { ...mockTicket, status: "RESOLVED" };
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.spyOn(ticketsApi, "updateTicket").mockResolvedValue(updatedTicket);

    const { result } = renderHook(() => useUpdateTicket("ticket-101"), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ status: "RESOLVED" });

    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ticketKeys.detail("ticket-101"),
      updatedTicket
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ticketKeys.detail("ticket-101"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ticketKeys.lists(),
    });
  });

  // 8. Comment query success
  it("useComments fetches comments list for ticket", async () => {
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue([mockComment]);

    const { result } = renderHook(() => useComments("ticket-101"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe("comment-201");
  });

  // 9. Create-comment mutation success and comment invalidation
  it("useCreateComment creates comment and invalidates comment query for ticket", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(ticketsApi, "createComment").mockResolvedValue(mockComment);

    const { result } = renderHook(() => useCreateComment("ticket-101"), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      body: "Investigating the hardware issue",
      isInternal: false,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: commentKeys.list("ticket-101"),
    });
  });

  // 10. Cache isolation during logout/account switching
  it("queryClient.clear isolates cache across logout/account switches", async () => {
    // Populate cache with ticket list and detail
    queryClient.setQueryData(ticketKeys.detail("ticket-101"), mockTicket);
    queryClient.setQueryData(ticketKeys.list(), {
      tickets: [mockTicket],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(queryClient.getQueryData(ticketKeys.detail("ticket-101"))).toBeDefined();
    expect(queryClient.getQueryData(ticketKeys.list())).toBeDefined();

    // Simulate logout action (auth.tsx calls queryClient.clear())
    queryClient.clear();

    // Verify cache is completely clean
    expect(queryClient.getQueryData(ticketKeys.detail("ticket-101"))).toBeUndefined();
    expect(queryClient.getQueryData(ticketKeys.list())).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
