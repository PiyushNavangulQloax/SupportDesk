import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { TicketStatus } from "../types";

export interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
  size?: "sm" | "md";
}

const statusConfig: Record<
  TicketStatus,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "brand" }
> = {
  OPEN: { label: "Open", variant: "brand" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  WAITING_ON_CUSTOMER: { label: "Waiting on Customer", variant: "neutral" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "neutral" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = "md",
}) => {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "neutral",
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={className}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </Badge>
  );
};
