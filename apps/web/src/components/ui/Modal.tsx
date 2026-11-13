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
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  className,
  closeOnEscape = true,
  closeOnBackdropClick = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const titleId = React.useId();
  const descId = React.useId();

  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  const getFocusableElements = (): HTMLElement[] => {
    if (!modalRef.current) return [];
    const elements = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    return elements.filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-hidden") !== "true"
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture previously active element if outside modal
    if (!modalRef.current?.contains(document.activeElement)) {
      triggerElementRef.current = (document.activeElement as HTMLElement) || null;
    }

    // 2. Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 3. Move focus inside modal if not already focused inside
    const focusable = getFocusableElements();
    const autoFocusEl = focusable.find(
      (el) =>
        (el as unknown as { autofocus?: boolean }).autofocus ||
        el.hasAttribute("autofocus") ||
        el.hasAttribute("data-autofocus")
    );

    if (autoFocusEl) {
      autoFocusEl.focus();
    } else if (!modalRef.current?.contains(document.activeElement)) {
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current?.focus();
      }
    }

    // 4. Trap focus and handle escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscapeRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab") {
        const focusable = getFocusableElements();

        if (focusable.length === 0) {
          e.preventDefault();
          modalRef.current?.focus();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
          // Backward tab: if on first element or outside modal, wrap to last
          if (
            activeElement === firstElement ||
            !modalRef.current?.contains(activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Forward tab: if on last element or outside modal, wrap to first
          if (
            activeElement === lastElement ||
            !modalRef.current?.contains(activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // 5. Prevent focus from leaving modal to background elements
    const handleFocusIn = (e: FocusEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        e.stopPropagation();
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = originalOverflow;

      // Restore focus to the trigger element
      if (
        triggerElementRef.current &&
        typeof triggerElementRef.current.focus === "function"
      ) {
        triggerElementRef.current.focus();
      }
      triggerElementRef.current = null;
    };
  }, [isOpen]);

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
        onClick={closeOnBackdropClick ? onClose : undefined}
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
