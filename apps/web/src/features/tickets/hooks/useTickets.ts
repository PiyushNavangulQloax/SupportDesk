import { useQuery } from "@tanstack/react-query";
import { listTickets } from "../api/tickets.api";
import { ticketKeys } from "./queryKeys";
import type { ListTicketsParams, PaginatedTicketsResponse } from "../types";

/**
 * Hook to fetch paginated and filtered tickets from the backend.
 * Parameters are captured in the queryKey to ensure independent cache buckets per filter/page.
 */
export function useTickets(params?: ListTicketsParams) {
  return useQuery<PaginatedTicketsResponse, Error>({
    queryKey: ticketKeys.list(params),
    queryFn: () => listTickets(params),
  });
}
