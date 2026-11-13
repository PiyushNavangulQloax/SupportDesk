import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { TicketList } from "../features/tickets/components/TicketList";
import { Button } from "../components/ui/Button";

export const TicketsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Support Tickets
          </h1>
          <p className="text-sm text-gray-500">
            View, search, and manage customer support inquiries
          </p>
        </div>
        <div>
          <Link to="/tickets/new" data-testid="create-ticket-link">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Create Ticket</span>
            </Button>
          </Link>
        </div>
      </div>

      <TicketList />
    </div>
  );
};
