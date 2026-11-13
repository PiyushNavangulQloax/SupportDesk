import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listComments, createComment } from "../api/tickets.api";
import { commentKeys } from "./queryKeys";
import type { Comment, CreateCommentInput } from "../types";

/**
 * Hook to fetch all visible comments for a specific ticket.
 * Query is disabled when ticketId is missing or empty.
 */
export function useComments(ticketId?: string | null) {
  const isEnabled = Boolean(
    ticketId && typeof ticketId === "string" && ticketId.trim().length > 0
  );

  return useQuery<Comment[], Error>({
    queryKey: commentKeys.list(ticketId || ""),
    queryFn: () => listComments(ticketId!),
    enabled: isEnabled,
  });
}

/**
 * Mutation hook to create a new comment on a ticket.
 * On success, invalidates the comment list query for this ticket.
 */
export function useCreateComment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, CreateCommentInput>({
    mutationFn: (input: CreateCommentInput) => createComment(ticketId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) });
    },
  });
}
