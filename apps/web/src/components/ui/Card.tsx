import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  className,
  padding = "md",
  children,
  ...props
}) => {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm",
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
