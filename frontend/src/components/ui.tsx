import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "brand" | "green" | "amber" | "red" | "violet";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-100 text-brand-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function impactTone(impactType: string): "red" | "amber" | "green" | "brand" | "violet" | "slate" {
  const t = impactType.toLowerCase();
  if (t.includes("declining")) return "red";
  if (t.includes("increasing") || t.includes("emerging")) return "green";
  if (t.includes("augment") || t.includes("changing")) return "amber";
  if (t.includes("enduring") || t.includes("human")) return "violet";
  if (t.includes("automated")) return "slate";
  return "brand";
}

export function ScoreBar({ value, tone }: { value: number; tone?: string }) {
  const color =
    tone ??
    (value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-rose-500");
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ScoreChip({ value, suffix = "/100" }: { value: number; suffix?: string }) {
  const color = value >= 70 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-rose-600";
  return (
    <span className={`text-lg font-bold tabular-nums ${color}`}>
      {value.toFixed(1)}
      <span className="text-xs font-medium text-slate-400">{suffix}</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <div className="text-brand-600">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card mx-auto my-8 max-w-lg p-6 text-center">
      <p className="text-sm font-medium text-rose-600">Something went wrong</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function fmtDate(value: string | undefined | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CardLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={`block transition-colors hover:bg-slate-50 ${className}`}>
      {children}
    </Link>
  );
}
