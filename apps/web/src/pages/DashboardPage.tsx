import React from "react";
import { LifeBuoy, ShieldCheck, Server, Ticket, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Card } from "../components/ui/Card";
import { Link } from "react-router-dom";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            Authenticated Session Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || "SupportDesk User"}!
          </h1>
          <p className="text-sm sm:text-base text-brand-100 leading-relaxed">
            You are signed in with the{" "}
            <span className="font-semibold text-white uppercase tracking-wider underline">
              {user?.role}
            </span>{" "}
            role. Your frontend foundations and centralized API client are operational.
          </p>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              API Connection
            </p>
            <p className="text-base font-bold text-gray-900">Connected</p>
            <p className="text-[11px] text-emerald-600 font-medium">REST API v1 Active</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              JWT Storage
            </p>
            <p className="text-base font-bold text-gray-900">sessionStorage</p>
            <p className="text-[11px] text-gray-500">Session-Scoped Isolation</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Frontend Milestone
            </p>
            <p className="text-base font-bold text-gray-900">Day 13 Complete</p>
            <p className="text-[11px] text-emerald-600 font-medium">Foundations Ready</p>
          </div>
        </Card>
      </div>

      {/* Ticket Feature Scaffolding Banner */}
      <Card className="p-6 border-dashed border-2 border-gray-300 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Ticket Feature Scaffolding
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Ticket listing, searching, pagination, and comments interface will be
                integrated in Day 14 under <code className="text-brand-700 font-mono text-xs">features/tickets/</code>.
              </p>
            </div>
          </div>
          <Link
            to="/tickets"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <span>View Ticket Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
};
