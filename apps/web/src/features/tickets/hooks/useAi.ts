import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  categorizeTicket,
  streamSuggestReply,
  type AiCategorizeResult,
} from "../api/ai.api";

/**
 * Mutation hook for requesting AI category and priority proposal.
 * Does NOT update the ticket automatically.
 */
export function useAiCategorize(ticketId?: string) {
  return useMutation<AiCategorizeResult, Error, void>({
    mutationFn: () => {
      if (!ticketId) throw new Error("Ticket ID is required");
      return categorizeTicket(ticketId);
    },
  });
}

export interface UseAiSuggestReplyReturn {
  isStreaming: boolean;
  error: string | null;
  startStreaming: (
    onChunk: (chunk: string) => void,
    instructions?: string
  ) => Promise<void>;
  cancel: () => void;
  resetError: () => void;
}

/**
 * Hook for managing SSE draft suggestion streaming.
 * Handles lifecycle, abort on unmount, and progressive chunk emission.
 * Does NOT send the comment.
 */
export function useAiSuggestReply(ticketId?: string): UseAiSuggestReplyReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Clean up any ongoing stream on unmount & track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsStreaming(false);
    }
  }, []);

  const resetError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  const startStreaming = useCallback(
    async (onChunk: (chunk: string) => void, instructions?: string) => {
      if (!ticketId) return;

      // Abort any previous active stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isMountedRef.current) {
        setIsStreaming(true);
        setError(null);
      }

      try {
        await streamSuggestReply(ticketId, {
          instructions,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (isMountedRef.current) {
              onChunk(chunk);
            }
          },
          onError: (err) => {
            if (isMountedRef.current) {
              setError(err.message || "Failed to generate reply suggestion.");
            }
          },
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError" && isMountedRef.current) {
          setError((err as Error).message || "Failed to generate reply suggestion.");
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          if (isMountedRef.current) {
            setIsStreaming(false);
          }
        }
      }
    },
    [ticketId]
  );

  return {
    isStreaming,
    error,
    startStreaming,
    cancel,
    resetError,
  };
}
