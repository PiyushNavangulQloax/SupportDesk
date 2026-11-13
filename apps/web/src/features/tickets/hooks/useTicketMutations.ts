import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTicket, updateTicket } from "../api/tickets.api";
import { ticketKeys } from "./queryKeys";
import type { CreateTicketInput, UpdateTicketInput, Ticket } from "../types";

/**
 * Mutation hook for creating a new ticket.
 * On success, invalidates all ticket list queries so views refresh automatically.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, CreateTicketInput>({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}

/**
 * Mutation hook for updating an existing ticket.
 * On success, updates detail cache and invalidates ticket lists.
 */
export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, UpdateTicketInput>({
    mutationFn: (input: UpdateTicketInput) => updateTicket(id, input),
    onSuccess: (updatedTicket: Ticket) => {
      queryClient.setQueryData(ticketKeys.detail(id), updatedTicket);
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}
