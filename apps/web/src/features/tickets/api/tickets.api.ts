import { apiRequest, apiRequestWithMeta } from "../../../lib/api-client";
import type {
  Ticket,
  Comment,
  CreateCommentInput,
  PaginationMeta,
  PaginatedTicketsResponse,
  ListTicketsParams,
  CreateTicketInput,
  UpdateTicketInput,
} from "../types";

/**
 * Serializes supported query parameters for GET /api/v1/tickets.
 * Omits undefined, null, or empty string values.
 */
export function buildQueryString(query?: ListTicketsParams): string {
  if (!query) return "";
  const params = new URLSearchParams();

  if (query.page !== undefined && query.page !== null) {
    params.set("page", String(query.page));
  }
  if (query.limit !== undefined && query.limit !== null) {
    params.set("limit", String(query.limit));
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.priority) {
    params.set("priority", query.priority);
  }
  if (query.category && query.category.trim() !== "") {
    params.set("category", query.category.trim());
  }
  if (query.assigneeId && query.assigneeId.trim() !== "") {
    params.set("assigneeId", query.assigneeId.trim());
  }
  if (query.search && query.search.trim() !== "") {
    params.set("search", query.search.trim());
  }
  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }
  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Lists tickets with optional pagination, filtering, search, and sorting.
 */
export async function listTickets(
  query?: ListTicketsParams
): Promise<PaginatedTicketsResponse> {
  const qs = buildQueryString(query);
  const response = await apiRequestWithMeta<Ticket[]>(`/tickets${qs}`);

  const paginationRaw = response.meta?.pagination as
    | Partial<PaginationMeta>
    | undefined;

  const pagination: PaginationMeta = {
    page: typeof paginationRaw?.page === "number" ? paginationRaw.page : 1,
    limit: typeof paginationRaw?.limit === "number" ? paginationRaw.limit : 20,
    total:
      typeof paginationRaw?.total === "number"
        ? paginationRaw.total
        : response.data?.length || 0,
    totalPages:
      typeof paginationRaw?.totalPages === "number"
        ? paginationRaw.totalPages
        : 1,
  };

  return {
    tickets: response.data || [],
    pagination,
  };
}

/**
 * Retrieves a single ticket by UUID.
 */
export async function getTicketById(id: string): Promise<Ticket> {
  return apiRequest<Ticket>(`/tickets/${encodeURIComponent(id)}`);
}

/**
 * Creates a new ticket.
 */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return apiRequest<Ticket>("/tickets", {
    method: "POST",
    body: input,
  });
}

/**
 * Updates an existing ticket by UUID.
 */
export async function updateTicket(
  id: string,
  input: UpdateTicketInput
): Promise<Ticket> {
  return apiRequest<Ticket>(`/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

/**
 * Lists all comments for a given ticket.
 */
export async function listComments(ticketId: string): Promise<Comment[]> {
  const comments = await apiRequest<Comment[]>(
    `/tickets/${encodeURIComponent(ticketId)}/comments`
  );
  return comments || [];
}

/**
 * Creates a comment on a ticket.
 */
export async function createComment(
  ticketId: string,
  input: CreateCommentInput
): Promise<Comment> {
  return apiRequest<Comment>(
    `/tickets/${encodeURIComponent(ticketId)}/comments`,
    {
      method: "POST",
      body: input,
    }
  );
}
