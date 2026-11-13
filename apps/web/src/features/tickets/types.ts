import type {
  CreateTicketInput,
  UpdateTicketInput,
  ListTicketsQuery,
  listTicketsQuerySchema,
} from "@supportdesk/schemas/ticket.schema";
import type { z } from "zod";

export type { CreateTicketInput, UpdateTicketInput, ListTicketsQuery };
export type ListTicketsParams = z.input<typeof listTicketsQuerySchema>;

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "P1" | "P2" | "P3" | "P4";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role?: "CUSTOMER" | "AGENT" | "ADMIN";
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  createdById: string;
  assigneeId: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserSummary;
  assignee?: UserSummary | null;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author?: UserSummary;
}

export interface CreateCommentInput {
  body: string;
  isInternal?: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTicketsResponse {
  tickets: Ticket[];
  pagination: PaginationMeta;
}
