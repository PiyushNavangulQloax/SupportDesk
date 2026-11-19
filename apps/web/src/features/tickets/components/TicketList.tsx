import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Ticket as TicketIcon,
  RotateCcw,
} from "lucide-react";
import { useTickets } from "../hooks/useTickets";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Card } from "../../../components/ui/Card";
import { Alert } from "../../../components/ui/Alert";
import { Avatar } from "../../../components/ui/Avatar";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LoadingState } from "../../../components/ui/LoadingState";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../components/ui/Table";
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  ListTicketsParams,
} from "../types";

export interface TicketListProps {
  pageSize?: number;
}

export function formatTicketDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return isoDate;
  }
}

export const TicketList: React.FC<TicketListProps> = ({ pageSize = 10 }) => {
  const navigate = useNavigate();

  // Filter & Pagination State
  const [page, setPage] = useState<number>(1);
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");

  // Memoize query params to pass to hook
  const queryParams = useMemo<ListTicketsParams>(() => {
    const params: ListTicketsParams = {
      page,
      limit: pageSize,
    };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (search) params.search = search;
    return params;
  }, [page, pageSize, status, priority, search]);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useTickets(queryParams);

  const tickets: Ticket[] = data?.tickets ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  const hasActiveFilters = Boolean(search || status || priority);

  // Filter actions — always reset pagination to page 1
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as TicketStatus | "");
    setPage(1);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriority(e.target.value as TicketPriority | "");
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPriority("");
    setPage(1);
  };

  // Pagination navigation
  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  // Calculate item range for pagination label
  const startItem = pagination.total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const endItem = Math.min(page * pagination.limit, pagination.total);

  return (
    <div className="space-y-4" data-testid="ticket-list-container">
      {/* 0. Top-Level Heading */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900" data-testid="ticket-list-heading">
          Tickets
        </h1>
      </div>

      {/* 1. Filter & Search Controls */}
      <Card padding="sm" className="bg-white">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search form */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 flex-1 max-w-lg"
            role="search"
          >
            <div className="relative flex-1">
              <Input
                placeholder="Search tickets by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                rightIcon={
                  searchInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        if (search) {
                          setSearch("");
                          setPage(1);
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label="Clear search input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null
                }
                aria-label="Search tickets"
                data-testid="ticket-search-input"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="md"
              data-testid="ticket-search-submit"
            >
              Search
            </Button>
          </form>

          {/* Filter dropdowns & Clear action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-40 sm:w-44">
              <Select
                value={status}
                onChange={handleStatusChange}
                aria-label="Filter by status"
                data-testid="ticket-status-filter"
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "OPEN", label: "Open" },
                  { value: "IN_PROGRESS", label: "In Progress" },
                  { value: "WAITING_ON_CUSTOMER", label: "Waiting on Customer" },
                  { value: "RESOLVED", label: "Resolved" },
                  { value: "CLOSED", label: "Closed" },
                ]}
              />
            </div>

            <div className="w-36 sm:w-40">
              <Select
                value={priority}
                onChange={handlePriorityChange}
                aria-label="Filter by priority"
                data-testid="ticket-priority-filter"
                options={[
                  { value: "", label: "All Priorities" },
                  { value: "P1", label: "P1 — Critical" },
                  { value: "P2", label: "P2 — High" },
                  { value: "P3", label: "P3 — Medium" },
                  { value: "P4", label: "P4 — Low" },
                ]}
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="md"
                onClick={handleClearFilters}
                className="text-gray-600 hover:text-gray-900 gap-1.5"
                data-testid="ticket-clear-filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </Button>
            )}

            {/* Background refetch indicator */}
            {isFetching && !isLoading && (
              <div
                className="flex items-center gap-1.5 text-xs text-brand-600 font-medium px-2 py-1 rounded bg-brand-50"
                role="status"
                aria-live="polite"
                data-testid="ticket-refreshing-indicator"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Refreshing...</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Error State */}
      {isError && (
        <Alert
          variant="error"
          title="Unable to load tickets"
          data-testid="ticket-list-error"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm">
              {error?.message || "An error occurred while fetching your tickets."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="self-start sm:self-auto shrink-0 bg-white"
            >
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {/* 3. Loading State */}
      {isLoading && (
        <LoadingState
          message="Loading tickets..."
          size="md"
          asCard
          data-testid="ticket-list-loading"
        />
      )}

      {/* 4. Empty State (No tickets in system / for customer) */}
      {!isLoading && !isError && tickets.length === 0 && !hasActiveFilters && (
        <EmptyState
          icon={<TicketIcon className="w-6 h-6" />}
          title="No tickets found"
          description="There are currently no support tickets to display."
          isDashed
          className="py-16"
          data-testid="ticket-list-empty"
        />
      )}

      {/* 5. No Results State (Filters returned 0 tickets) */}
      {!isLoading && !isError && tickets.length === 0 && hasActiveFilters && (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title="No matching tickets"
          description="No tickets match your search query or selected filter criteria."
          isDashed
          className="py-16"
          data-testid="ticket-list-no-results"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              data-testid="ticket-no-results-clear"
            >
              Clear all filters
            </Button>
          }
        />
      )}

      {/* 6. Tickets Table / List */}
      {!isLoading && !isError && tickets.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          {/* Desktop Table View */}
          <Table containerClassName="hidden lg:block" data-testid="ticket-table">
            <TableHeader>
              <TableRow>
                <TableHead className="py-3.5 pl-6 pr-3">
                  Ticket Details
                </TableHead>
                <TableHead>
                  Status
                </TableHead>
                <TableHead>
                  Priority
                </TableHead>
                <TableHead>
                  Category
                </TableHead>
                <TableHead>
                  Assignee
                </TableHead>
                <TableHead>
                  Created
                </TableHead>
                <TableHead className="py-3.5 pl-3 pr-6 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  isClickable
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="group"
                  data-testid={`ticket-row-${ticket.id}`}
                >
                  {/* Title & Description preview */}
                  <TableCell className="py-4 pl-6 pr-3 max-w-sm">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors block truncate"
                      data-testid={`ticket-title-${ticket.id}`}
                    >
                      {ticket.title}
                    </Link>
                    {ticket.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5 max-w-xs">
                        {ticket.description}
                      </p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={ticket.status} size="sm" />
                  </TableCell>

                  {/* Priority */}
                  <TableCell className="whitespace-nowrap">
                    <PriorityBadge priority={ticket.priority} size="sm" />
                  </TableCell>

                  {/* Category */}
                  <TableCell className="whitespace-nowrap">
                    {ticket.category ? (
                      <Badge variant="neutral" size="sm">
                        {ticket.category}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Assignee */}
                  <TableCell className="whitespace-nowrap">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={ticket.assignee.name || ticket.assignee.email}
                          role="AGENT"
                          size="xs"
                        />
                        <span
                          className="text-xs font-medium text-gray-800 truncate max-w-[130px]"
                          title={ticket.assignee.name || ticket.assignee.email}
                        >
                          {ticket.assignee.name || ticket.assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Unassigned
                      </span>
                    )}
                  </TableCell>

                  {/* Created Date */}
                  <TableCell className="whitespace-nowrap text-xs text-gray-500">
                    {formatTicketDate(ticket.createdAt)}
                  </TableCell>

                  {/* Action link */}
                  <TableCell className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-xs font-medium">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand-600 hover:text-brand-900 group-hover:underline inline-flex items-center gap-1"
                      aria-label={`View ticket: ${ticket.title}`}
                    >
                      View &rarr;
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Mobile & Tablet Card List View (< lg) */}
          <div className="divide-y divide-gray-200 lg:hidden">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer space-y-3"
                data-testid={`ticket-card-${ticket.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-sm text-gray-900 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded transition-colors leading-snug"
                    data-testid={`ticket-card-title-${ticket.id}`}
                  >
                    {ticket.title}
                  </Link>
                  <StatusBadge status={ticket.status} size="sm" />
                </div>

                {ticket.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {ticket.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <PriorityBadge priority={ticket.priority} size="sm" />
                  {ticket.category && (
                    <Badge variant="neutral" size="sm">
                      {ticket.category}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <span className="inline-flex items-center gap-1.5">
                    {ticket.assignee ? (
                      <>
                        <Avatar
                          name={ticket.assignee.name || ticket.assignee.email}
                          role="AGENT"
                          size="xs"
                        />
                        <span className="font-medium text-gray-700">
                          {ticket.assignee.name || ticket.assignee.email}
                        </span>
                      </>
                    ) : (
                      <span className="italic text-gray-400">Unassigned</span>
                    )}
                  </span>
                  <span>{formatTicketDate(ticket.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 7. Server-side Pagination Controls */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50/50"
            data-testid="ticket-pagination"
          >
            <div className="text-xs text-gray-600 font-medium">
              Showing <span className="font-semibold text-gray-900">{startItem}</span> to{" "}
              <span className="font-semibold text-gray-900">{endItem}</span> of{" "}
              <span className="font-semibold text-gray-900">{pagination.total}</span> tickets
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1 || isFetching}
                aria-label="Previous page"
                data-testid="ticket-pagination-prev"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <span
                className="text-xs font-semibold text-gray-700 px-2"
                data-testid="ticket-pagination-info"
              >
                Page {page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= pagination.totalPages || isFetching}
                aria-label="Next page"
                data-testid="ticket-pagination-next"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
