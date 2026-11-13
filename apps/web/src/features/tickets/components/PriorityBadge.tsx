import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { TicketPriority } from "../types";

export interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
  size?: "sm" | "md";
}

const priorityConfig: Record<
  TicketPriority,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "brand" }
> = {
  P1: { label: "P1 — Critical", variant: "danger" },
  P2: { label: "P2 — High", variant: "warning" },
  P3: { label: "P3 — Medium", variant: "brand" },
  P4: { label: "P4 — Low", variant: "neutral" },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className,
  size = "md",
}) => {
  const config = priorityConfig[priority] ?? {
    label: priority,
    variant: "neutral",
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={className}
      data-testid={`priority-badge-${priority.toLowerCase()}`}
    >
      <span>{config.label}</span>
    </Badge>
  );
};
