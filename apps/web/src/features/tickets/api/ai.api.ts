import { apiRequest, getApiBaseUrl, getStoredToken, ApiError } from "../../../lib/api-client";
import type { TicketPriority } from "../types";

export interface AiCategorizeResult {
  category: string;
  priority: TicketPriority;
  reasoning: string;
}

export interface StreamSuggestReplyOptions {
  instructions?: string;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  onDone?: (meta?: unknown) => void;
  onError?: (err: Error) => void;
}

/**
 * Requests structured category and priority proposal from backend AI service.
 * Does NOT mutate the ticket in the database.
 */
export async function categorizeTicket(ticketId: string): Promise<AiCategorizeResult> {
  return apiRequest<AiCategorizeResult>(
    `/tickets/${encodeURIComponent(ticketId)}/ai/categorize`,
    {
      method: "POST",
    }
  );
}

/**
 * Streams progressive reply draft suggestion via backend SSE endpoint.
 * Progressive text chunks are delivered to onChunk callback.
 * Does NOT submit or send the comment.
 */
export async function streamSuggestReply(
  ticketId: string,
  options: StreamSuggestReplyOptions
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/tickets/${encodeURIComponent(ticketId)}/ai/suggest-reply`;

  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        instructions: options.instructions || undefined,
      }),
      signal: options.signal,
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === "AbortError") {
      return;
    }
    const netErr = new ApiError(
      0,
      "NETWORK_ERROR",
      "Network error: Unable to connect to AI reply suggestion stream.",
      err
    );
    options.onError?.(netErr);
    throw netErr;
  }

  if (!response.ok) {
    let errorCode = `HTTP_${response.status}`;
    let errorMessage = "AI suggestion stream failed";
    let details: unknown = undefined;

    try {
      const errPayload = await response.json();
      if (errPayload?.error) {
        errorCode = errPayload.error.code || errorCode;
        errorMessage = errPayload.error.message || errorMessage;
        details = errPayload.error.details;
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    const apiErr = new ApiError(response.status, errorCode, errorMessage, details);
    options.onError?.(apiErr);
    throw apiErr;
  }

  if (!response.body) {
    throw new ApiError(500, "EMPTY_STREAM_ERROR", "Response body is empty or streaming unsupported");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are delimited by double newline (\n\n)
      const blocks = buffer.split("\n\n");
      // The last element is either empty (if ended with \n\n) or a partial event block
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        let eventType = "message";
        let dataPayload = "";

        const lines = block.split("\n");
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const part = line.slice(5).trim();
            dataPayload = dataPayload ? `${dataPayload}\n${part}` : part;
          }
        }

        if (eventType === "error") {
          let errData: { message?: string; code?: string } = {};
          try {
            if (dataPayload) errData = JSON.parse(dataPayload);
          } catch {
            // Ignore JSON parse error for error payload
          }
          const streamErr = new ApiError(
            502,
            errData.code || "AI_STREAM_ERROR",
            errData.message || "Interrupted stream from AI service"
          );
          options.onError?.(streamErr);
          throw streamErr;
        }

        if (dataPayload === "[DONE]") {
          options.onDone?.();
          return;
        }

        if (dataPayload) {
          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.chunk) {
              options.onChunk(parsed.chunk);
            }
            if (parsed.done) {
              options.onDone?.(parsed);
            }
          } catch {
            // Ignore non-JSON heartbeat or raw data chunk
          }
        }
      }
    }

    // Flush any remaining buffer on stream completion
    if (buffer.trim()) {
      const lines = buffer.split("\n");
      let dataPayload = "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith("data:")) {
          const part = line.slice(5).trim();
          dataPayload = dataPayload ? `${dataPayload}\n${part}` : part;
        }
      }
      if (dataPayload && dataPayload !== "[DONE]") {
        try {
          const parsed = JSON.parse(dataPayload);
          if (parsed.chunk) options.onChunk(parsed.chunk);
          if (parsed.done) options.onDone?.(parsed);
        } catch {
          // Ignore
        }
      }
    }

    options.onDone?.();
  } catch (err: unknown) {
    if ((err as Error)?.name === "AbortError") {
      return;
    }
    options.onError?.(err as Error);
    throw err;
  } finally {
    reader.releaseLock();
  }
}
