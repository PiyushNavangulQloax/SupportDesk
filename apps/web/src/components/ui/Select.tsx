import React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      id,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              "block w-full appearance-none rounded-lg border text-sm transition-colors py-2 pl-3 pr-10 bg-white text-gray-900",
              "focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-200 text-red-900"
                : "border-gray-300 focus:border-brand-500 focus:ring-brand-200",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
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

Select.displayName = "Select";
