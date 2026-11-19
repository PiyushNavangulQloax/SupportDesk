import React from "react";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { RoleBadge } from "../ui/RoleBadge";

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

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
              <Avatar name={user.name} role={user.role} size="md" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-gray-500">{user.email}</p>
              </div>
            </div>

            <RoleBadge role={user.role} showIcon size="sm" />
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="text-gray-600 hover:text-red-600 hover:border-red-200"
          title="Sign out of SupportDesk"
          aria-label="Sign out of SupportDesk"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
};
