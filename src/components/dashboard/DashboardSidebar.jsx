"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

export default function DashboardSidebar({
  activeId,
  collapsed = false,
  headerLabel = "Dashboard",
  items = [],
  mobileOpen = false,
  onClose,
  onCollapse,
  onLogout,
  onSelect,
  user,
  footer
}) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-violet-100 bg-white p-4 shadow-2xl transition dark:border-violet-900/70 dark:bg-stone-950 lg:sticky lg:top-24 lg:z-auto lg:h-[calc(100vh-7rem)] lg:translate-x-0 lg:rounded-[1.5rem] lg:border lg:shadow-soft ${collapsed ? "lg:w-24" : "lg:w-72"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
          <p className="text-xs font-black uppercase tracking-wide text-violet-500">{headerLabel}</p>
          <h2 className="truncate text-lg font-black text-ink dark:text-white">{user?.name || user?.email || "Admin"}</h2>
        </div>
        {onCollapse && (
          <button className="hidden rounded-xl border border-violet-100 p-2 text-violet-700 transition hover:bg-violet-50 dark:border-violet-900/70 dark:text-violet-100 dark:hover:bg-white/10 lg:inline-flex" type="button" onClick={onCollapse} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        {onClose && (
          <button className="rounded-xl border border-violet-100 p-2 text-violet-700 lg:hidden" type="button" onClick={onClose} aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="mt-6 space-y-2">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition ${
              activeId === id
                ? "bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white shadow-glow"
                : "text-violet-950/70 hover:bg-violet-50 hover:text-violet-800 dark:text-violet-100/75 dark:hover:bg-white/10"
            } ${collapsed ? "lg:justify-center" : ""}`}
            title={label}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
          </button>
        ))}
      </nav>

      {footer && <div className={collapsed ? "mt-5 lg:hidden" : "mt-5"}>{footer}</div>}

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className={`mt-5 flex w-full items-center gap-3 rounded-2xl border border-red-100 px-3 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:hover:bg-red-950/30 ${collapsed ? "lg:justify-center" : ""}`}
          title="Logout"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
        </button>
      )}
    </aside>
  );
}
