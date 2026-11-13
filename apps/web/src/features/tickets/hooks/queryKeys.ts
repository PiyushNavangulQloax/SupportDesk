import type { ListTicketsParams } from "../types";

/**
 * Stable, centralized Query Key factory for Tickets and Comments.
 */
export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (params?: ListTicketsParams) =>
    [...ticketKeys.lists(), params ?? {}] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
};

export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (ticketId: string) => [...commentKeys.lists(), ticketId] as const,
};
