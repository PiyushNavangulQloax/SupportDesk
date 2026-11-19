import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "brand" | "purple";
  size?: "sm" | "md";
  dot?: boolean;
  dotClassName?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  dotClassName,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full border select-none transition-colors";

  const variantStyles = {
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0", dotClassName)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
