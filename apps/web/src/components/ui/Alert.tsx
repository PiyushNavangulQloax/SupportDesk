import React from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "warning" | "success" | "info";
  title?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = "info",
  title,
  children,
  onClose,
  ...props
}) => {
  const styles = {
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
      close: "text-red-500 hover:bg-red-100",
    },
    warning: {
      container: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      close: "text-amber-500 hover:bg-amber-100",
    },
    success: {
      container: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      close: "text-emerald-500 hover:bg-emerald-100",
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      close: "text-blue-500 hover:bg-blue-100",
    },
  };

  const current = styles[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 p-3.5 rounded-lg border text-sm transition-all",
        current.container,
        className
      )}
      {...props}
    >
      {current.icon}
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-semibold text-sm leading-tight">{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className={cn("p-1 rounded-md transition-colors -mr-1 -mt-1", current.close)}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
