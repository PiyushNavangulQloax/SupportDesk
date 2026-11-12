import React from "react";
import { LogOut, User as UserIcon, Shield, Menu } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Button";

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const roleBadgeStyles: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
    AGENT: "bg-blue-100 text-blue-800 border-blue-200",
    CUSTOMER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };

  const roleBadge = user?.role ? roleBadgeStyles[user.role] || "bg-gray-100 text-gray-800" : "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight hidden sm:block">
          SupportDesk Portal
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-gray-500">{user.email}</p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge}`}
            >
              <Shield className="w-3 h-3" />
              {user.role}
            </span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="text-gray-600 hover:text-red-600 hover:border-red-200"
          title="Sign out of SupportDesk"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
};
