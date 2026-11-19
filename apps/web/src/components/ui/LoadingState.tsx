import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Card, type CardProps } from "./Card";

export type LoadingStateSize = "sm" | "md" | "lg";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  size?: LoadingStateSize;
  cardPadding?: CardProps["padding"];
  asCard?: boolean;
  "data-testid"?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  size = "md",
  cardPadding,
  asCard = true,
  className,
  "data-testid": testId,
  ...props
}) => {
  const spinnerSizes: Record<LoadingStateSize, string> = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const containerPadding: Record<LoadingStateSize, string> = {
    sm: "py-8 px-4",
    md: "py-16 px-4",
    lg: "py-20 px-4",
  };

  const layoutStyles: Record<LoadingStateSize, string> = {
    sm: "flex items-center justify-center gap-2 text-sm",
    md: "flex flex-col items-center justify-center gap-3 text-sm",
    lg: "flex flex-col items-center justify-center gap-4 text-base",
  };

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={cn(layoutStyles[size], "text-gray-500 font-medium")}
    >
      <Loader2
        className={cn("animate-spin text-brand-600 shrink-0", spinnerSizes[size])}
        aria-hidden="true"
      />
      {message && <span>{message}</span>}
    </div>
  );

  const containerClasses = cn("text-center", containerPadding[size], className);

  if (asCard) {
    return (
      <Card
        padding={cardPadding}
        className={containerClasses}
        data-testid={testId}
        {...props}
      >
        {content}
      </Card>
    );
  }

  return (
    <div
      className={containerClasses}
      data-testid={testId}
      {...props}
    >
      {content}
    </div>
  );
};

LoadingState.displayName = "LoadingState";
