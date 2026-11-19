import React from "react";
import { Shield } from "lucide-react";
import { Badge, type BadgeProps } from "./Badge";
import type { UserRole } from "../../lib/api-client";
import { cn } from "../../lib/utils";

export interface RoleBadgeProps extends Omit<BadgeProps, "variant"> {
  role: UserRole | string;
  showIcon?: boolean;
  format?: "uppercase" | "capitalize";
  variant?: BadgeProps["variant"];
  "data-testid"?: string;
}

const ROLE_VARIANTS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  ADMIN: "purple",
  AGENT: "brand",
  CUSTOMER: "success",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
  CUSTOMER: "CUSTOMER",
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showIcon = false,
  format = "uppercase",
  size = "md",
  variant: explicitVariant,
  className,
  children,
  "data-testid": testId,
  ...props
}) => {
  const normalizedKey = typeof role === "string" ? role.trim().toUpperCase() : "";
  const variant = explicitVariant || ROLE_VARIANTS[normalizedKey] || "neutral";

  let displayLabel: string;
  if (children) {
    displayLabel = "";
  } else if (ROLE_LABELS[normalizedKey]) {
    displayLabel =
      format === "capitalize"
        ? normalizedKey.charAt(0) + normalizedKey.slice(1).toLowerCase()
        : ROLE_LABELS[normalizedKey];
  } else {
    displayLabel = role || "UNKNOWN";
  }

  const defaultTestId = normalizedKey
    ? `role-badge-${normalizedKey.toLowerCase()}`
    : "role-badge-unknown";

  return (
    <Badge
      variant={variant}
      size={size}
      className={cn("select-none", className)}
      data-testid={testId || defaultTestId}
      {...props}
    >
      {showIcon && <Shield className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" />}
      {children || <span>{displayLabel}</span>}
    </Badge>
  );
};

RoleBadge.displayName = "RoleBadge";
