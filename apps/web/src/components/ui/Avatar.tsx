import React from "react";
import { User as UserIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  name?: string | null;
  role?: "ADMIN" | "AGENT" | "CUSTOMER" | string | null;
  size?: AvatarSize;
  label?: string;
}

export function getInitials(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  role,
  size = "md",
  label,
  className,
  ...props
}) => {
  const initials = getInitials(name);

  const sizeStyles: Record<AvatarSize, { container: string; icon: string }> = {
    xs: { container: "w-6 h-6 text-[10px]", icon: "w-3 h-3" },
    sm: { container: "w-7 h-7 text-xs", icon: "w-3.5 h-3.5" },
    md: { container: "w-8 h-8 text-xs", icon: "w-4 h-4" },
    lg: { container: "w-10 h-10 text-sm", icon: "w-5 h-5" },
  };

  const normalizedRole = role ? role.toUpperCase() : null;

  const roleStyles: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    AGENT: "bg-blue-100 text-blue-700",
    CUSTOMER: "bg-emerald-100 text-emerald-700",
  };

  const colorStyle = (normalizedRole && roleStyles[normalizedRole]) || "bg-brand-100 text-brand-700";
  const currentSize = sizeStyles[size] || sizeStyles.md;

  const accessibleLabel =
    label || props["aria-label"] || (name?.trim() ? `${name.trim()}'s avatar` : "User avatar");

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      className={cn(
        "rounded-full flex items-center justify-center font-bold shrink-0 select-none",
        currentSize.container,
        colorStyle,
        className
      )}
      {...props}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <UserIcon className={currentSize.icon} aria-hidden="true" />
      )}
    </div>
  );
};

Avatar.displayName = "Avatar";
