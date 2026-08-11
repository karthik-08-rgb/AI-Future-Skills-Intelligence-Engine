import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Brain,
  ChevronRight,
  FileUp,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageSquareText,
  Network,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Waypoints,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/future-skills", label: "Future Skills", icon: TrendingUp },
  { to: "/declining-skills", label: "Declining Skills", icon: TrendingDown },
  { to: "/reskilling", label: "Reskilling", icon: Waypoints },
  { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquareText },
  { to: "/explorer", label: "Org Explorer", icon: Network },
  { to: "/import", label: "Data Import", icon: FileUp },
  { to: "/knowledge", label: "Knowledge", icon: Sparkles },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Brain size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">AFS Intelligence</p>
            <p className="text-[11px] leading-tight text-slate-400">Future Skills Engine</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <User size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name ?? "User"}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.role.replace("_", " ")}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Sign out"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {item.to ? (
            <NavLink to={item.to} className="text-brand-600 hover:underline">
              {item.label}
            </NavLink>
          ) : (
            <span className="text-slate-600">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-slate-900 to-slate-950 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Brain size={22} />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-white">AFS Intelligence</p>
            <p className="text-[11px] text-slate-400">AI Future Skills Intelligence Engine</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
