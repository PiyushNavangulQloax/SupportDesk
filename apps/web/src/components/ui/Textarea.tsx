import React, { useState } from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      rows = 4,
      maxLength,
      showCount = false,
      id,
      disabled,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    const [currentLength, setCurrentLength] = useState<number>(() => {
      if (typeof value === "string") return value.length;
      if (typeof defaultValue === "string") return defaultValue.length;
      return 0;
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentLength(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className="block text-sm font-medium text-gray-700"
            >
              {label}
            </label>
          )}
          {showCount && maxLength !== undefined && (
            <span
              className="text-xs text-gray-400"
              data-testid="textarea-char-count"
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <div className="relative rounded-lg shadow-sm">
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            maxLength={maxLength}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            className={cn(
              "block w-full rounded-lg border text-sm transition-colors py-2 px-3 text-gray-900 placeholder:text-gray-400 resize-y",
              "focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-200 text-red-900 placeholder:text-red-300"
                : "border-gray-300 focus:border-brand-500 focus:ring-brand-200",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
