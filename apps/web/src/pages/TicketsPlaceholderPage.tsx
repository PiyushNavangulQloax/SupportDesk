import React from "react";
import { Ticket, Clock } from "lucide-react";
import { Card } from "../components/ui/Card";

export const TicketsPlaceholderPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Support Tickets
        </h1>
        <p className="text-sm text-gray-500">
          Manage and track customer support inquiries across teams
        </p>
      </div>

      <Card className="text-center py-12 px-4 border-dashed border-2">
        <div className="max-w-md mx-auto space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-600">
            <Ticket className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Ticket Feature Scaffolding Initialized
          </h2>
          <p className="text-sm text-gray-600">
            The foundation directories (<code className="font-mono text-xs">features/tickets/api</code>, <code className="font-mono text-xs">hooks</code>, and <code className="font-mono text-xs">components</code>) are ready for Week 3 Day 2 (Day 14).
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Full Ticket Querying & Mutations Scheduled for Day 14
          </div>
        </div>
      </Card>
    </div>
  );
};
