import React from "react";
import { cn } from "../../lib/utils";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, children, ...props }, ref) => (
    <div className={cn("relative w-full overflow-x-auto", containerClassName)}>
      <table
        ref={ref}
        className={cn(
          "w-full text-left text-sm text-gray-600 divide-y divide-gray-200",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);
Table.displayName = "Table";

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-gray-100 bg-white", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isClickable?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isClickable = false, onClick, onKeyDown, tabIndex, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (isClickable && onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLTableRowElement>);
      }
      onKeyDown?.(e);
    };

    return (
      <tr
        ref={ref}
        tabIndex={isClickable ? (tabIndex ?? 0) : tabIndex}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "transition-colors",
          isClickable
            ? "cursor-pointer hover:bg-gray-50/80 focus:outline-none focus:bg-gray-50 focus:ring-1 focus:ring-inset focus:ring-brand-500"
            : "hover:bg-gray-50/50",
          className
        )}
        {...props}
      />
    );
  }
);
TableRow.displayName = "TableRow";

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(({ className, scope = "col", ...props }, ref) => (
  <th
    ref={ref}
    scope={scope}
    className={cn(
      "px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-3 py-4 text-sm text-gray-600 align-middle", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";
