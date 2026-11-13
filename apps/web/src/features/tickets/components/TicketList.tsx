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
  User as UserIcon,
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
        <Card className="py-16 text-center" data-testid="ticket-list-loading">
          <div
            className="flex flex-col items-center justify-center gap-3 text-gray-500"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Loading tickets...</p>
          </div>
        </Card>
      )}

      {/* 4. Empty State (No tickets in system / for customer) */}
      {!isLoading && !isError && tickets.length === 0 && !hasActiveFilters && (
        <Card
          className="text-center py-16 px-4 border-dashed border-2"
          data-testid="ticket-list-empty"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
              <TicketIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              No tickets found
            </h3>
            <p className="text-sm text-gray-500">
              There are currently no support tickets to display.
            </p>
          </div>
        </Card>
      )}

      {/* 5. No Results State (Filters returned 0 tickets) */}
      {!isLoading && !isError && tickets.length === 0 && hasActiveFilters && (
        <Card
          className="text-center py-16 px-4 border-dashed border-2"
          data-testid="ticket-list-no-results"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              No matching tickets
            </h3>
            <p className="text-sm text-gray-500">
              No tickets match your search query or selected filter criteria.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                data-testid="ticket-no-results-clear"
              >
                Clear all filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 6. Tickets Table / List */}
      {!isLoading && !isError && tickets.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table
              className="w-full text-left text-sm text-gray-600 divide-y divide-gray-200"
              data-testid="ticket-table"
            >
              <thead className="bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">
                    Ticket Details
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Priority
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Assignee
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Created
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    data-testid={`ticket-row-${ticket.id}`}
                  >
                    {/* Title & Description preview */}
                    <td className="py-4 pl-6 pr-3 max-w-sm">
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
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-4">
                      <StatusBadge status={ticket.status} size="sm" />
                    </td>

                    {/* Priority */}
                    <td className="whitespace-nowrap px-3 py-4">
                      <PriorityBadge priority={ticket.priority} size="sm" />
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-3 py-4">
                      {ticket.category ? (
                        <Badge variant="neutral" size="sm">
                          {ticket.category}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Assignee (supported by API response) */}
                    <td className="whitespace-nowrap px-3 py-4">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {ticket.assignee.name
                              ? ticket.assignee.name.charAt(0).toUpperCase()
                              : <UserIcon className="w-3 h-3" />}
                          </div>
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
                    </td>

                    {/* Created Date */}
                    <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                      {formatTicketDate(ticket.createdAt)}
                    </td>

                    {/* Action link */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-xs font-medium">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand-600 hover:text-brand-900 group-hover:underline inline-flex items-center gap-1"
                        aria-label={`View ticket: ${ticket.title}`}
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="divide-y divide-gray-200 md:hidden">
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
                    className="font-semibold text-sm text-gray-900 hover:text-brand-600 leading-snug"
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
                  <span>
                    {ticket.assignee ? (
                      <span className="font-medium text-gray-700">
                        {ticket.assignee.name || ticket.assignee.email}
                      </span>
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
