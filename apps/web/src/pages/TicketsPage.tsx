import React from "react";
import { TicketList } from "../features/tickets/components/TicketList";

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
      </div>

      <TicketList />
    </div>
  );
};
