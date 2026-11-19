import React from "react";
import { cn } from "../../lib/utils";
import { Card } from "./Card";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  isDashed?: boolean;
  asCard?: boolean;
  "data-testid"?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  isDashed = true,
  asCard = true,
  className,
  children,
  "data-testid": testId,
  ...props
}) => {
  const content = (
    <div className="max-w-md mx-auto space-y-3">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {children}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );

  const containerClasses = cn(
    "text-center py-16 px-4",
    isDashed ? "border-dashed border-2" : "border",
    className
  );

  if (asCard) {
    return (
      <Card
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

EmptyState.displayName = "EmptyState";
