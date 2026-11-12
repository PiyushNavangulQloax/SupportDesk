import React from "react";
import { NavLink } from "react-router-dom";
import { LifeBuoy, LayoutDashboard, Ticket, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navItems = [
    {
      label: "Dashboard",
      to: "/",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "Tickets",
      to: "/tickets",
      icon: <Ticket className="w-4 h-4" />,
      badge: "Foundation",
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-gray-900 text-white w-64 p-4">
      <div className="space-y-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">
                SupportDesk
              </h1>
              <p className="text-[11px] text-gray-400 mt-1">Enterprise Platform</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-white p-1 rounded-md"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )
              }
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-2 pt-4 border-t border-gray-800 text-xs text-gray-500">
        <p className="font-medium text-gray-400">SupportDesk Web Client</p>
        <p className="text-[11px] text-gray-500">Week 3 &bull; Frontend Foundations</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform md:hidden transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
};
