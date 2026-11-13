import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, LifeBuoy, Send } from "lucide-react";
import {
  createTicketBodySchema,
  type CreateTicketInput,
} from "@supportdesk/schemas/ticket.schema";
import type { z } from "zod";
import { useCreateTicket } from "../hooks/useTicketMutations";
import { ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth";
import type { Ticket } from "../types";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Alert } from "../../../components/ui/Alert";

export type CreateTicketFormInput = z.input<typeof createTicketBodySchema>;
export type CreateTicketFormOutput = z.output<typeof createTicketBodySchema>;

export interface CreateTicketProps {
  onSuccess?: (ticket: Ticket) => void;
  onCancel?: () => void;
  className?: string;
}

const PRIORITY_OPTIONS = [
  { value: "P1", label: "P1 — Critical (Outage / System Unusable)" },
  { value: "P2", label: "P2 — High (Major functionality broken)" },
  { value: "P3", label: "P3 — Medium (Normal business impact)" },
  { value: "P4", label: "P4 — Low (Minor question or general request)" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Select a category (optional)" },
  { value: "Technical", label: "Technical Support" },
  { value: "Billing", label: "Billing & Invoicing" },
  { value: "Account", label: "Account & Access" },
  { value: "General", label: "General Inquiry" },
  { value: "Feature Request", label: "Feature Request" },
];

export const CreateTicket: React.FC<CreateTicketProps> = ({
  onSuccess,
  onCancel,
  className = "",
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createTicketMutation = useCreateTicket();

  const [apiError, setApiError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormInput, unknown, CreateTicketFormOutput>({
    resolver: zodResolver(createTicketBodySchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "P3",
      category: "",
    },
    mode: "onBlur",
  });

  const isPending = isSubmitting || createTicketMutation.isPending;

  const handleFormSubmit = async (formData: CreateTicketFormOutput): Promise<void> => {
    setApiError(null);

    // Prepare payload adhering strictly to backend contract
    const payload: CreateTicketInput = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      category: formData.category?.trim() ? formData.category.trim() : undefined,
    };

    try {
      const ticket = await createTicketMutation.mutateAsync(payload);
      setCreatedTicket(ticket);
      reset();

      if (onSuccess) {
        onSuccess(ticket);
      } else {
        navigate(`/tickets/${ticket.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setApiError("Your session has expired. Please sign in again.");
        } else if (err.status === 403) {
          setApiError(err.message || "You are not authorized to create tickets.");
        } else if (err.status === 400) {
          setApiError(err.message || "Invalid ticket data. Please review your entries.");
        } else if (err.status === 0 || err.code === "NETWORK_ERROR") {
          setApiError(
            "Unable to connect to the SupportDesk server. Please check your network connection."
          );
        } else {
          setApiError(err.message || "A server error occurred while creating the ticket.");
        }
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleCancelClick = (): void => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/tickets");
    }
  };

  return (
    <div className={`space-y-6 max-w-3xl mx-auto ${className}`}>
      {/* Navigation and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={handleCancelClick}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors mb-2 focus:outline-none focus:underline"
            data-testid="back-to-tickets-button"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to tickets</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Create Support Ticket
          </h1>
          <p className="text-sm text-gray-500">
            Submit a new support ticket. Our team will review and respond as soon as possible.
          </p>
        </div>
      </div>

      {/* Success banner if staying on page */}
      {createdTicket && (
        <Alert
          variant="success"
          title="Ticket Created Successfully"
          className="border-emerald-200 bg-emerald-50 text-emerald-900"
          data-testid="create-ticket-success-alert"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Your ticket <span className="font-semibold">#{createdTicket.id.slice(0, 8)}</span> has been registered.
            </p>
            <Link
              to={`/tickets/${createdTicket.id}`}
              className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
            >
              View Ticket &rarr;
            </Link>
          </div>
        </Alert>
      )}

      {/* Server / Network Error Alert */}
      {apiError && (
        <Alert
          variant="error"
          title="Failed to Create Ticket"
          onClose={() => setApiError(null)}
          data-testid="create-ticket-error-alert"
        >
          {apiError}
        </Alert>
      )}

      {/* Main Ticket Form Card */}
      <Card className="shadow-sm border-gray-200">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
          className="space-y-6 p-1 sm:p-2"
          aria-label="Create ticket form"
          data-testid="create-ticket-form"
        >
          {/* Ticket Title */}
          <div>
            <Input
              id="ticket-title"
              label="Ticket Title"
              placeholder="e.g. Cannot access billing statements in customer portal"
              error={errors.title?.message}
              helperText="Brief summary of the issue (minimum 3 characters)."
              maxLength={255}
              disabled={isPending}
              data-testid="ticket-title-input"
              {...register("title")}
            />
          </div>

          {/* Priority & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Select
                id="ticket-priority"
                label="Priority"
                options={PRIORITY_OPTIONS}
                error={errors.priority?.message}
                helperText="Expected urgency or business impact."
                disabled={isPending}
                data-testid="ticket-priority-select"
                {...register("priority")}
              />
            </div>

            <div>
              <Select
                id="ticket-category"
                label="Category"
                options={CATEGORY_OPTIONS}
                error={errors.category?.message}
                helperText="Helps route your ticket to the right department."
                disabled={isPending}
                data-testid="ticket-category-select"
                {...register("category")}
              />
            </div>
          </div>

          {/* Ticket Description */}
          <div>
            <Textarea
              id="ticket-description"
              label="Description"
              placeholder="Describe the issue in detail. Include any relevant error messages, steps to reproduce, or browser/device information."
              rows={7}
              showCount
              maxLength={5000}
              error={errors.description?.message}
              helperText="Detailed explanation of the issue (minimum 5 characters)."
              disabled={isPending}
              data-testid="ticket-description-textarea"
              {...register("description")}
            />
          </div>

          {/* Informational Guidance Notice */}
          <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-4 text-xs text-blue-800 flex items-start gap-2.5">
            <LifeBuoy className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900">
                Logged in as {user?.name || "User"} ({user?.role || "CUSTOMER"})
              </p>
              <p className="text-blue-700">
                Your ticket will be automatically linked to your account. You will receive updates as support agents review and comment on your request.
              </p>
            </div>
          </div>

          {/* Actions: Cancel & Submit */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isPending}
              data-testid="cancel-create-ticket-button"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              isLoading={isPending}
              className="flex items-center gap-2"
              data-testid="submit-create-ticket-button"
            >
              {!isPending && <Send className="w-4 h-4" />}
              <span>{isPending ? "Creating Ticket..." : "Create Ticket"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
