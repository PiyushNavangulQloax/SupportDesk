import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/lib/auth";
import { TicketDetailPage } from "../src/pages/TicketDetailPage";
import * as ticketsApi from "../src/features/tickets/api/tickets.api";
import * as aiApi from "../src/features/tickets/api/ai.api";
import type { Ticket, Comment } from "../src/features/tickets/types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

const mockTicket: Ticket = {
  id: "ticket-ai-101",
  title: "Cannot access invoice billing history",
  description: "When clicking on Invoices, it says 403 Forbidden. Need access to download last quarter invoices.",
  status: "OPEN",
  priority: "P2",
  category: "Technical",
  createdById: "cust-1",
  assigneeId: "agent-1",
  slaDueAt: "2026-11-20T18:00:00.000Z",
  createdAt: "2026-11-17T08:30:00.000Z",
  updatedAt: "2026-11-17T09:00:00.000Z",
  createdBy: {
    id: "cust-1",
    name: "Alice Customer",
    email: "alice@customer.com",
    role: "CUSTOMER",
  },
  assignee: {
    id: "agent-1",
    name: "Agent Bob",
    email: "bob@supportdesk.internal",
    role: "AGENT",
  },
};

const mockComments: Comment[] = [
  {
    id: "comment-1",
    ticketId: "ticket-ai-101",
    authorId: "cust-1",
    body: "Please help, our accounting audit is tomorrow.",
    isInternal: false,
    createdAt: "2026-11-17T08:35:00.000Z",
    author: {
      id: "cust-1",
      name: "Alice Customer",
      email: "alice@customer.com",
      role: "CUSTOMER",
    },
  },
];

function renderTicketDetail(userRole = "AGENT") {
  const queryClient = createTestQueryClient();

  sessionStorage.setItem("supportdesk_access_token", "valid-test-token");
  sessionStorage.setItem(
    "supportdesk_user",
    JSON.stringify({
      id: userRole === "CUSTOMER" ? "cust-1" : userRole === "ADMIN" ? "admin-1" : "agent-1",
      name: userRole === "CUSTOMER" ? "Alice Customer" : userRole === "ADMIN" ? "Admin Sarah" : "Agent Bob",
      email: userRole === "CUSTOMER" ? "alice@customer.com" : userRole === "ADMIN" ? "admin@supportdesk.internal" : "bob@supportdesk.internal",
      role: userRole,
    })
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/tickets/ticket-ai-101"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Day 16 — AI Features Frontend Integration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/api/v1");

    vi.spyOn(ticketsApi, "getTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(ticketsApi, "listComments").mockResolvedValue(mockComments);
  });

  describe("1. Suggest Reply Visibility & Role Guarding", () => {
    it("renders 'Suggest Reply' button for AGENT role", async () => {
      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ticket-title")).toHaveTextContent("Cannot access invoice billing history");
      });

      expect(screen.getByTestId("suggest-reply-btn")).toBeInTheDocument();
      expect(screen.getByTestId("suggest-reply-btn")).toBeEnabled();
    });

    it("renders 'Suggest Reply' button for ADMIN role", async () => {
      renderTicketDetail("ADMIN");

      await waitFor(() => {
        expect(screen.getByTestId("ticket-title")).toHaveTextContent("Cannot access invoice billing history");
      });

      expect(screen.getByTestId("suggest-reply-btn")).toBeInTheDocument();
      expect(screen.getByTestId("suggest-reply-btn")).toBeEnabled();
    });

    it("hides 'Suggest Reply' button for CUSTOMER role", async () => {
      renderTicketDetail("CUSTOMER");

      await waitFor(() => {
        expect(screen.getByTestId("ticket-title")).toHaveTextContent("Cannot access invoice billing history");
      });

      expect(screen.queryByTestId("suggest-reply-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("ai-categorize-btn")).not.toBeInTheDocument();
    });
  });

  describe("2. Progressive Streaming Reply Draft & No Auto-Send", () => {
    it("progressively updates reply composer textarea as chunks arrive", async () => {
      const streamSpy = vi.spyOn(aiApi, "streamSuggestReply").mockImplementation(
        async (_ticketId, options) => {
          options.onChunk("Hello Alice,\n\n");
          options.onChunk("I have reviewed your billing permissions ");
          options.onChunk("and restored invoice portal access.");
          options.onDone?.();
        }
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-btn")).toBeInTheDocument();
      });

      const suggestBtn = screen.getByTestId("suggest-reply-btn");
      fireEvent.click(suggestBtn);

      await waitFor(() => {
        expect(streamSpy).toHaveBeenCalledTimes(1);
      });

      const textarea = screen.getByTestId("comment-textarea") as HTMLTextAreaElement;
      expect(textarea.value).toContain("Hello Alice,");
      expect(textarea.value).toContain("restored invoice portal access.");
    });

    it("allows the agent to edit generated draft and does NOT automatically send the reply", async () => {
      const createCommentSpy = vi.spyOn(ticketsApi, "createComment").mockResolvedValue({
        id: "comment-new",
        ticketId: "ticket-ai-101",
        authorId: "agent-1",
        body: "Hello Alice, edited draft.",
        isInternal: false,
        createdAt: "2026-11-17T09:10:00.000Z",
      });

      vi.spyOn(aiApi, "streamSuggestReply").mockImplementation(
        async (_ticketId, options) => {
          options.onChunk("Draft reply from AI.");
          options.onDone?.();
        }
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-btn")).toBeInTheDocument();
      });

      // Click suggest reply
      fireEvent.click(screen.getByTestId("suggest-reply-btn"));

      const textarea = screen.getByTestId("comment-textarea") as HTMLTextAreaElement;
      await waitFor(() => {
        expect(textarea.value).toBe("Draft reply from AI.");
      });

      // Critical verification: comment creation endpoint MUST NOT be called after generation!
      expect(createCommentSpy).not.toHaveBeenCalled();

      // Agent edits the text
      fireEvent.change(textarea, { target: { value: "Draft reply from AI. With manual agent modifications." } });
      expect(textarea.value).toBe("Draft reply from AI. With manual agent modifications.");

      // Critical verification: still not sent until agent clicks submit
      expect(createCommentSpy).not.toHaveBeenCalled();

      // Agent explicitly clicks Send response
      const submitBtn = screen.getByTestId("comment-submit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createCommentSpy).toHaveBeenCalledTimes(1);
        expect(createCommentSpy).toHaveBeenCalledWith("ticket-ai-101", {
          body: "Draft reply from AI. With manual agent modifications.",
          isInternal: false,
        });
      });
    });

    it("handles streaming errors gracefully and displays error alert", async () => {
      vi.spyOn(aiApi, "streamSuggestReply").mockImplementation(
        async (_ticketId, options) => {
          options.onChunk("Partial chunk...");
          options.onError?.(new Error("AI generation service quota exceeded"));
          throw new Error("AI generation service quota exceeded");
        }
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("suggest-reply-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-error")).toBeInTheDocument();
        expect(screen.getByTestId("suggest-reply-error")).toHaveTextContent("quota exceeded");
      });
    });
  });

  describe("3. AI Categorisation & Priority Proposal Flow", () => {
    it("renders 'AI Categorise' button in sidebar for AGENT and ADMIN", async () => {
      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-btn")).toBeInTheDocument();
      });
    });

    it("displays suggestion proposal card upon clicking AI Categorise", async () => {
      const categorizeSpy = vi.spyOn(aiApi, "categorizeTicket").mockResolvedValue({
        category: "Billing",
        priority: "P1",
        reasoning: "The customer is blocked from accessing financial invoices for an upcoming audit.",
      });

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("ai-categorize-btn"));

      await waitFor(() => {
        expect(categorizeSpy).toHaveBeenCalledWith("ticket-ai-101");
        expect(screen.getByTestId("ai-suggestion-card")).toBeInTheDocument();
      });

      expect(screen.getByTestId("ai-suggested-category")).toHaveTextContent("Billing");
      expect(screen.getByTestId("ai-suggested-priority")).toHaveTextContent("P1");
      expect(screen.getByTestId("ai-suggested-reasoning")).toHaveTextContent("blocked from accessing financial invoices");
      expect(screen.getByTestId("apply-ai-suggestion-btn")).toBeInTheDocument();
      expect(screen.getByTestId("dismiss-ai-suggestion-btn")).toBeInTheDocument();
    });

    it("does NOT update ticket before explicit agent approval", async () => {
      const updateTicketSpy = vi.spyOn(ticketsApi, "updateTicket").mockResolvedValue({
        ...mockTicket,
        category: "Billing",
        priority: "P1",
      });

      vi.spyOn(aiApi, "categorizeTicket").mockResolvedValue({
        category: "Billing",
        priority: "P1",
        reasoning: "Reasoning for triage.",
      });

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("ai-categorize-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("ai-suggestion-card")).toBeInTheDocument();
      });

      // Critical verification: receiving the suggestion must NOT trigger updateTicket!
      expect(updateTicketSpy).not.toHaveBeenCalled();

      // Agent can dismiss without applying
      fireEvent.click(screen.getByTestId("dismiss-ai-suggestion-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("ai-suggestion-card")).not.toBeInTheDocument();
      });

      // Still no update called
      expect(updateTicketSpy).not.toHaveBeenCalled();
    });

    it("applies ticket update ONLY after explicit approval click", async () => {
      const updateTicketSpy = vi.spyOn(ticketsApi, "updateTicket").mockResolvedValue({
        ...mockTicket,
        category: "Billing",
        priority: "P1",
      });

      vi.spyOn(aiApi, "categorizeTicket").mockResolvedValue({
        category: "Billing",
        priority: "P1",
        reasoning: "Reasoning for triage.",
      });

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("ai-categorize-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("apply-ai-suggestion-btn")).toBeInTheDocument();
      });

      // Agent clicks Apply Suggestion
      fireEvent.click(screen.getByTestId("apply-ai-suggestion-btn"));

      await waitFor(() => {
        expect(updateTicketSpy).toHaveBeenCalledTimes(1);
        expect(updateTicketSpy).toHaveBeenCalledWith("ticket-ai-101", {
          category: "Billing",
          priority: "P1",
        });
      });

      // Suggestion card is cleared after successful application
      await waitFor(() => {
        expect(screen.queryByTestId("ai-suggestion-card")).not.toBeInTheDocument();
      });
    });

    it("handles AI categorise API errors gracefully", async () => {
      vi.spyOn(aiApi, "categorizeTicket").mockRejectedValue(
        new Error("AI categorization model unavailable (503)")
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("ai-categorize-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-error")).toBeInTheDocument();
        expect(screen.getByTestId("ai-categorize-error")).toHaveTextContent("unavailable");
      });
    });

    it("displays error and keeps suggestion card when ticket update mutation fails", async () => {
      vi.spyOn(aiApi, "categorizeTicket").mockResolvedValue({
        category: "Billing",
        priority: "P1",
        reasoning: "Invoice access issue.",
      });

      vi.spyOn(ticketsApi, "updateTicket").mockRejectedValue(
        new Error("Network connection dropped during ticket update")
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("ai-categorize-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("apply-ai-suggestion-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("apply-ai-suggestion-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("ai-categorize-error")).toBeInTheDocument();
        expect(screen.getByTestId("ai-categorize-error")).toHaveTextContent("Network connection dropped");
      });

      // Suggestion card is preserved so the agent can retry
      expect(screen.getByTestId("ai-suggestion-card")).toBeInTheDocument();
    });
  });

  describe("4. Reply Protection & Safe Streaming Buffer", () => {
    it("preserves pre-existing agent text and appends suggestion safely with paragraph separation", async () => {
      vi.spyOn(aiApi, "streamSuggestReply").mockImplementation(
        async (_ticketId, options) => {
          options.onChunk("Thank you for reaching out.");
          options.onDone?.();
        }
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
      });

      const textarea = screen.getByTestId("comment-textarea") as HTMLTextAreaElement;
      // Agent manually typed some notes first
      fireEvent.change(textarea, { target: { value: "Internal diagnosis: customer account active." } });
      expect(textarea.value).toBe("Internal diagnosis: customer account active.");

      // Agent clicks Suggest Reply
      fireEvent.click(screen.getByTestId("suggest-reply-btn"));

      await waitFor(() => {
        expect(textarea.value).toContain("Internal diagnosis: customer account active.");
        expect(textarea.value).toContain("Thank you for reaching out.");
      });

      // Verifies original text is not overwritten
      expect(textarea.value).toBe(
        "Internal diagnosis: customer account active.\n\nThank you for reaching out."
      );
    });

    it("does not clear existing composer text if AI stream fails midway", async () => {
      vi.spyOn(aiApi, "streamSuggestReply").mockImplementation(
        async (_ticketId, options) => {
          options.onChunk("Partial reply...");
          options.onError?.(new Error("Stream timeout"));
          throw new Error("Stream timeout");
        }
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("comment-textarea")).toBeInTheDocument();
      });

      const textarea = screen.getByTestId("comment-textarea") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Original text from agent." } });

      fireEvent.click(screen.getByTestId("suggest-reply-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-error")).toBeInTheDocument();
      });

      // Existing text must be preserved, including whatever partial chunk arrived
      expect(textarea.value).toContain("Original text from agent.");
      expect(textarea.value).toContain("Partial reply...");
    });

    it("stops streaming when agent clicks Stop button", async () => {
      let isAborted = false;
      vi.spyOn(aiApi, "streamSuggestReply").mockImplementation(
        async (_ticketId, options) => {
          options.signal?.addEventListener("abort", () => {
            isAborted = true;
          });
          options.onChunk("Chunk 1. ");
          // Simulate delayed next chunk
          await new Promise((resolve) => setTimeout(resolve, 50));
          if (!options.signal?.aborted) {
            options.onChunk("Chunk 2.");
          }
        }
      );

      renderTicketDetail("AGENT");

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("suggest-reply-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("suggest-reply-cancel-btn")).toBeInTheDocument();
      });

      // Click Stop button
      fireEvent.click(screen.getByTestId("suggest-reply-cancel-btn"));

      expect(isAborted).toBe(true);
      await waitFor(() => {
        expect(screen.queryByTestId("suggest-reply-cancel-btn")).not.toBeInTheDocument();
      });
    });
  });

  describe("5. Low-Level SSE Parser Protocol Verification", () => {
    it("handles multi-line and split chunks across network buffers correctly", async () => {
      const chunks: string[] = [];
      let isDone = false;

      // Simulate a stream that splits SSE events across reads
      const sseTextParts = [
        "data: {\"chunk\": \"Hello \"}\n\n",
        "data: {\"chunk\": \"world", // partial line
        " from \", \"extra\": 1}\n\n", // continuation
        "event: error\n", // split event header
        "data: {\"code\": \"TEST_ERR\", \"message\": \"Simulated stream error\"}\n\n",
      ];

      let partIndex = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (partIndex >= sseTextParts.length) {
            return { done: true, value: undefined };
          }
          const encoder = new TextEncoder();
          const val = encoder.encode(sseTextParts[partIndex++]);
          return { done: false, value: val };
        }),
        releaseLock: vi.fn(),
      };

      const mockBody = {
        getReader: () => mockReader,
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: mockBody,
      }));

      let capturedError: any = null;
      try {
        await aiApi.streamSuggestReply("ticket-123", {
          onChunk: (c) => chunks.push(c),
          onDone: () => { isDone = true; },
          onError: (err) => { capturedError = err; },
        });
      } catch (err) {
        capturedError = err;
      }

      expect(chunks).toEqual(["Hello ", "world from "]);
      expect(isDone).toBe(false);
      expect(capturedError).toBeDefined();
      expect(capturedError.code).toBe("TEST_ERR");
      expect(capturedError.message).toBe("Simulated stream error");
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });
});
