import { useQuery } from "@tanstack/react-query";
import { getTicketById } from "../api/tickets.api";
import { ticketKeys } from "./queryKeys";
import type { Ticket } from "../types";

/**
 * Hook to fetch a single ticket by its UUID.
 * The query is automatically disabled when id is missing or empty.
 */
export function useTicket(id?: string | null) {
  const isEnabled = Boolean(id && typeof id === "string" && id.trim().length > 0);

  return useQuery<Ticket, Error>({
    queryKey: ticketKeys.detail(id || ""),
    queryFn: () => getTicketById(id!),
    enabled: isEnabled,
  });
}
