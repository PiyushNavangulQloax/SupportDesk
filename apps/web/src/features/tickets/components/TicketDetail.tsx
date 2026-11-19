import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  AlertCircle,
  Lock,
  Tag,
  CheckCircle2,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { useTicket } from "../hooks/useTicket";
import { useComments, useCreateComment } from "../hooks/useComments";
import { useUpdateTicket } from "../hooks/useTicketMutations";
import { useAiCategorize, useAiSuggestReply } from "../hooks/useAi";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Textarea } from "../../../components/ui/Textarea";
import { Card } from "../../../components/ui/Card";
import { Alert } from "../../../components/ui/Alert";
import { Avatar } from "../../../components/ui/Avatar";
import { RoleBadge } from "../../../components/ui/RoleBadge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ApiError } from "../../../lib/api-client";
import type { Comment } from "../types";
import type { AiCategorizeResult } from "../api/ai.api";

export function formatDateTime(isoDate?: string | null): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return isoDate;
  }
}

export interface TicketDetailProps {
  ticketId?: string;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId: propTicketId }) => {
  const params = useParams<{ ticketId?: string; id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const ticketId = propTicketId || params.ticketId || params.id;

  // Form state for comment submission
  const [commentText, setCommentText] = useState<string>("");
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>("");

  // Queries & Mutations
  const {
    data: ticket,
    isLoading: isLoadingTicket,
    isError: isTicketError,
    error: ticketError,
    refetch: refetchTicket,
  } = useTicket(ticketId);

  const {
    data: comments = [],
    isLoading: isLoadingComments,
    isError: isCommentsError,
    error: commentsError,
    refetch: refetchComments,
  } = useComments(ticketId);

  const createCommentMutation = useCreateComment(ticketId || "");
  const updateTicketMutation = useUpdateTicket(ticketId || "");

  // AI Feature States & Hooks
  const [pendingAiSuggestion, setPendingAiSuggestion] = useState<AiCategorizeResult | null>(null);
  const [aiCategorizeError, setAiCategorizeError] = useState<string | null>(null);

  const aiCategorizeMutation = useAiCategorize(ticketId);
  const {
    isStreaming: isAiStreaming,
    error: aiStreamError,
    startStreaming: startSuggestReply,
    cancel: cancelSuggestReply,
    resetError: resetStreamError,
  } = useAiSuggestReply(ticketId);

  const handleSuggestReply = () => {
    resetStreamError();
    let isFirstChunk = true;
    startSuggestReply((chunk) => {
      setCommentText((prev) => {
        if (isFirstChunk) {
          isFirstChunk = false;
          if (prev.trim().length > 0) {
            const separator = prev.endsWith("\n\n") ? "" : prev.endsWith("\n") ? "\n" : "\n\n";
            return prev + separator + chunk;
          }
        }
        return prev + chunk;
      });
      if (validationError) setValidationError("");
    });
  };

  const handleAiCategorize = () => {
    setAiCategorizeError(null);
    aiCategorizeMutation.mutate(undefined, {
      onSuccess: (data) => {
        setPendingAiSuggestion(data);
      },
      onError: (err) => {
        setAiCategorizeError(err.message || "Failed to classify ticket.");
      },
    });
  };

  const handleApplyAiSuggestion = () => {
    if (!pendingAiSuggestion) return;
    setAiCategorizeError(null);
    updateTicketMutation.mutate(
      {
        category: pendingAiSuggestion.category,
        priority: pendingAiSuggestion.priority,
      },
      {
        onSuccess: () => {
          setPendingAiSuggestion(null);
        },
        onError: (err) => {
          setAiCategorizeError(err.message || "Failed to update ticket.");
        },
      }
    );
  };

  const handleDismissAiSuggestion = () => {
    setPendingAiSuggestion(null);
  };

  // Empty or invalid ticket ID
  if (!ticketId || ticketId.trim() === "") {
    return (
      <div className="space-y-6" data-testid="ticket-invalid-id">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tickets")}
          className="gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to tickets</span>
        </Button>
        <EmptyState
          icon={<AlertCircle className="w-12 h-12 text-amber-500" />}
          title="Invalid Ticket Identifier"
          description="The requested ticket URL is missing a valid identifier."
          isDashed
          className="py-16"
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/tickets")}>
              Return to tickets list
            </Button>
          }
        />
      </div>
    );
  }

  // Loading state
  if (isLoadingTicket) {
    return (
      <LoadingState
        message="Loading ticket details..."
        size="md"
        asCard={false}
        className="py-24"
        data-testid="ticket-detail-loading"
      />
    );
  }

  // Not Found State (404)
  const is404 =
    (ticketError instanceof ApiError && ticketError.status === 404) ||
    ticketError?.message?.toLowerCase().includes("not found");

  if (isTicketError && is404) {
    return (
      <div className="space-y-6" data-testid="ticket-detail-not-found">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tickets")}
          className="gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to tickets</span>
        </Button>
        <EmptyState
          icon={<AlertCircle className="w-12 h-12 text-gray-400" />}
          title="Ticket Not Found"
          description="We couldn't find the ticket you're looking for. It may have been removed or you may not have access to view it."
          isDashed
          className="py-16"
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/tickets")}>
              Return to tickets list
            </Button>
          }
        />
      </div>
    );
  }

  // Other Error State
  if (isTicketError || !ticket) {
    return (
      <div className="space-y-6" data-testid="ticket-detail-error">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tickets")}
          className="gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to tickets</span>
        </Button>
        <Alert variant="error" title="Unable to load ticket">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm">
              {ticketError?.message || "An unexpected error occurred while fetching the ticket."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchTicket()} className="bg-white shrink-0">
              Try again
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Handle comment submit
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) {
      setValidationError("Comment cannot be empty");
      return;
    }
    setValidationError("");

    // Customers cannot create internal notes
    const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";
    const internalPayload = isStaff ? isInternal : false;

    createCommentMutation.mutate(
      {
        body: trimmed,
        isInternal: internalPayload,
      },
      {
        onSuccess: () => {
          setCommentText("");
          setIsInternal(false);
        },
      }
    );
  };

  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  return (
    <div className="space-y-6" data-testid="ticket-detail-container">
      {/* Back button & Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          data-testid="back-to-tickets-link"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all tickets</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono" data-testid="ticket-id-display">
            ID: {ticket.id}
          </span>
        </div>
      </div>

      {/* Main Layout: 2/3 Content & 1/3 Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Details & Comments (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header & Description Card */}
          <Card className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} size="sm" />
                <PriorityBadge priority={ticket.priority} size="sm" />
                {ticket.category && (
                  <Badge variant="neutral" size="sm">
                    <Tag className="w-3 h-3 mr-1 opacity-70" />
                    {ticket.category}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight" data-testid="ticket-title">
                {ticket.title}
              </h1>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Description
              </h3>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words" data-testid="ticket-description">
                {ticket.description}
              </div>
            </div>
          </Card>

          {/* Conversation & Comments History */}
          <div className="space-y-4" data-testid="ticket-comments-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-900">Conversation History</h2>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"
                  data-testid="comments-count-badge"
                >
                  {comments.length}
                </span>
              </div>
            </div>

            {/* Comments Loading */}
            {isLoadingComments && (
              <LoadingState
                message="Loading comments..."
                size="sm"
                asCard
                className="py-8 text-center"
                data-testid="comments-loading"
              />
            )}

            {/* Comments Error */}
            {isCommentsError && (
              <Alert variant="error" title="Failed to load comments" data-testid="comments-error">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm">{commentsError?.message || "Could not retrieve comments thread."}</p>
                  <Button variant="outline" size="sm" onClick={() => refetchComments()} className="bg-white shrink-0">
                    Retry
                  </Button>
                </div>
              </Alert>
            )}

            {/* Empty Comments State */}
            {!isLoadingComments && !isCommentsError && comments.length === 0 && (
              <EmptyState
                icon={<MessageSquare className="w-8 h-8 text-gray-400 opacity-60" />}
                title="No comments yet"
                description="Start the conversation by posting a reply below."
                isDashed
                className="py-10"
                data-testid="comments-empty"
              />
            )}

            {/* Comments Thread List */}
            {!isLoadingComments && !isCommentsError && comments.length > 0 && (
              <div className="space-y-3" data-testid="comments-list">
                {comments.map((comment: Comment) => {
                  const authorRole = comment.author?.role;
                  const isCommentInternal = Boolean(comment.isInternal);

                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCommentInternal
                          ? "bg-amber-50/70 border-amber-200"
                          : authorRole === "AGENT" || authorRole === "ADMIN"
                          ? "bg-white border-blue-200 shadow-sm"
                          : "bg-white border-gray-200 shadow-sm"
                      }`}
                      data-testid={`comment-item-${comment.id}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={comment.author?.name || comment.author?.email || "Support User"}
                            role={isCommentInternal ? undefined : authorRole}
                            size="sm"
                            className={isCommentInternal ? "bg-amber-200 text-amber-900" : undefined}
                          />

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-900">
                                {comment.author?.name || comment.author?.email || "Support User"}
                              </span>

                              {authorRole && (
                                <RoleBadge
                                  role={authorRole}
                                  size="sm"
                                  data-testid={`comment-role-${authorRole.toLowerCase()}`}
                                />
                              )}

                              {isCommentInternal && (
                                <Badge
                                  variant="warning"
                                  size="sm"
                                  className="gap-1 border-amber-300 bg-amber-100 text-amber-800"
                                  data-testid="internal-note-badge"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  Internal Note
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-500 whitespace-nowrap">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed pl-9">
                        {comment.body}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Comment Card */}
            <Card className="p-5">
              <form onSubmit={handleCommentSubmit} className="space-y-3" data-testid="add-comment-form">
                <div className="flex items-center justify-between">
                  <label htmlFor="ticket-comment-input" className="block text-sm font-semibold text-gray-900">
                    Add a response
                  </label>
                  {isStaff && (
                    <div className="flex items-center gap-2">
                      {isAiStreaming ? (
                        <div className="flex items-center gap-2" data-testid="suggest-reply-loading">
                          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            Streaming draft...
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={cancelSuggestReply}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid="suggest-reply-cancel-btn"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSuggestReply}
                          disabled={createCommentMutation.isPending}
                          className="h-7 px-2.5 text-xs font-medium text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 gap-1.5"
                          data-testid="suggest-reply-btn"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Suggest Reply
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {aiStreamError && (
                  <Alert variant="error" className="py-2 text-xs" onClose={resetStreamError} data-testid="suggest-reply-error">
                    <span>{aiStreamError}</span>
                  </Alert>
                )}

                <Textarea
                  id="ticket-comment-input"
                  placeholder="Type your response or update here..."
                  rows={4}
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    if (validationError) setValidationError("");
                  }}
                  error={validationError || (createCommentMutation.isError ? createCommentMutation.error.message : undefined)}
                  maxLength={5000}
                  showCount
                  disabled={createCommentMutation.isPending}
                  data-testid="comment-textarea"
                />

                {/* Staff-only internal note toggle */}
                {isStaff && (
                  <label className="flex items-center gap-2 text-xs font-medium text-amber-900 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                      disabled={createCommentMutation.isPending}
                      data-testid="comment-internal-toggle"
                    />
                    <span>Make this an internal note (only visible to Agents and Admins)</span>
                  </label>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-gray-500">
                    {createCommentMutation.isSuccess && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Comment posted
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={createCommentMutation.isPending}
                    disabled={createCommentMutation.isPending || !commentText.trim()}
                    data-testid="comment-submit-btn"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isInternal ? "Add internal note" : "Send response"}</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>

        {/* Right Column: Ticket Metadata Sidebar (1 col on lg) */}
        <aside className="space-y-4" data-testid="ticket-sidebar">
          <Card className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Ticket Overview
            </h3>

            {/* Status & Priority */}
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Status</span>
                <StatusBadge status={ticket.status} size="md" />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Priority</span>
                <PriorityBadge priority={ticket.priority} size="md" />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Category</span>
                {ticket.category ? (
                  <Badge variant="neutral" size="md">
                    {ticket.category}
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-400 italic">Uncategorized</span>
                )}
              </div>
            </div>

            {/* AI Categorise & Priority Section (Staff Only) */}
            {isStaff && (
              <div className="pt-3 border-t border-gray-100 space-y-3" data-testid="ai-categorize-section">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    AI Triage
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiCategorize}
                    disabled={aiCategorizeMutation.isPending || updateTicketMutation.isPending}
                    isLoading={aiCategorizeMutation.isPending}
                    className="h-7 px-2.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 gap-1.5"
                    data-testid="ai-categorize-btn"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Categorise
                  </Button>
                </div>

                {/* AI Error Alert */}
                {aiCategorizeError && (
                  <Alert variant="error" className="py-2 text-xs" onClose={() => setAiCategorizeError(null)} data-testid="ai-categorize-error">
                    <span>{aiCategorizeError}</span>
                  </Alert>
                )}

                {/* AI Suggestion Proposal Card (Explicit Agent Approval Required) */}
                {pendingAiSuggestion && (
                  <div
                    className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/70 space-y-2.5 transition-all shadow-sm"
                    data-testid="ai-suggestion-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800 uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        AI Suggestion
                      </span>
                      <span className="text-[10px] text-gray-500 italic">Pending Approval</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-medium">Category:</span>
                        <Badge variant="neutral" size="sm" data-testid="ai-suggested-category">
                          {pendingAiSuggestion.category}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-medium">Priority:</span>
                        <div data-testid="ai-suggested-priority">
                          <PriorityBadge priority={pendingAiSuggestion.priority} size="sm" />
                        </div>
                      </div>

                      <div
                        className="pt-1.5 border-t border-indigo-100 text-[11px] text-gray-700 leading-relaxed"
                        data-testid="ai-suggested-reasoning"
                      >
                        <span className="font-semibold text-gray-800">Reasoning: </span>
                        {pendingAiSuggestion.reasoning}
                      </div>
                    </div>

                    {/* Agent Approval Actions */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-indigo-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDismissAiSuggestion}
                        disabled={updateTicketMutation.isPending}
                        className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                        data-testid="dismiss-ai-suggestion-btn"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleApplyAiSuggestion}
                        isLoading={updateTicketMutation.isPending}
                        disabled={updateTicketMutation.isPending}
                        className="h-7 px-2.5 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        data-testid="apply-ai-suggestion-btn"
                      >
                        <Check className="w-3 h-3" />
                        Apply Suggestion
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* People (Requester & Assignee) */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Customer / Requester</span>
                {ticket.createdBy ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={ticket.createdBy.name || ticket.createdBy.email}
                      role="CUSTOMER"
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate" title={ticket.createdBy.name}>
                        {ticket.createdBy.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate" title={ticket.createdBy.email}>
                        {ticket.createdBy.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Requester ID: {ticket.createdById}</span>
                )}
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1">Assigned Agent</span>
                {ticket.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={ticket.assignee.name || ticket.assignee.email}
                      role="AGENT"
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate" title={ticket.assignee.name}>
                        {ticket.assignee.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate" title={ticket.assignee.email}>
                        {ticket.assignee.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Unassigned</span>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created</span>
                </span>
                <span className="font-medium text-gray-800" data-testid="ticket-created-at">
                  {formatDateTime(ticket.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated</span>
                </span>
                <span className="font-medium text-gray-800" data-testid="ticket-updated-at">
                  {formatDateTime(ticket.updatedAt)}
                </span>
              </div>

              {ticket.slaDueAt && (
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>SLA Due</span>
                  </span>
                  <span className="font-medium text-amber-800" data-testid="ticket-sla-due">
                    {formatDateTime(ticket.slaDueAt)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};
