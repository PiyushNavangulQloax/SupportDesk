import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // Escape key listener & Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the modal container on open
    modalRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        data-testid="modal-backdrop"
      />

      {/* Dialog Content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-10 transition-all focus:outline-none",
          maxWidthStyles[maxWidth],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-gray-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[calc(100vh-14rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
