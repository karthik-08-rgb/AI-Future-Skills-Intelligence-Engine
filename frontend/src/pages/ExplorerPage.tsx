import { Link } from "react-router-dom";
import { ChevronRight, Network } from "lucide-react";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import type { ExplorerProcess } from "../lib/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, percent, Spinner } from "../components/ui";

export function ExplorerPage() {
  const { data, loading, error, reload } = useFetch(() => api.explorer());

  if (loading) return <Spinner label="Loading organization model…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const processes = data.processes;

  return (
    <div>
      <PageHeader
        title="Organization Explorer"
        description="Your Process → Activity → Role → Skill model with AI impact at every level."
        action={
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Network size={15} />
            {processes.length} processes
          </div>
        }
      />

      <div className="space-y-4">
        {processes.map((p: ExplorerProcess) => (
          <Card key={p.id}>
            <Link to={`/processes/${p.id}`} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 transition-colors hover:bg-slate-50">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                {p.description && <p className="mt-0.5 text-sm text-slate-500">{p.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="slate">{p.category}</Badge>
                <Badge tone="brand">{p.activities.length} activities</Badge>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            </Link>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {p.activities.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-sm font-medium text-slate-800">{a.name}</p>
                  {a.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{a.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {a.roles.slice(0, 3).map((r) => (
                      <Link
                        key={r.role.id}
                        to={`/roles/${r.role.id}`}
                        className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-brand-600 shadow-sm hover:text-brand-700"
                      >
                        {r.role.name}
                      </Link>
                    ))}
                    {a.skills.slice(0, 4).map((s) => (
                      <span
                        key={s.skill.id}
                        className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[11px] text-slate-500"
                      >
                        {s.skill.name}
                      </span>
                    ))}
                    {a.skills.length > 4 && (
                      <span className="text-[11px] text-slate-400">+{a.skills.length - 4} more</span>
                    )}
                  </div>
                  {p.processAiImpacts[0] && (
                    <div className="mt-2 flex gap-3 text-[11px] text-slate-400">
                      <span>auto {percent(p.processAiImpacts[0].automationPotential ?? 0)}</span>
                      <span>aug {percent(p.processAiImpacts[0].augmentationPotential ?? 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}

        {processes.length === 0 && (
          <Card>
            <EmptyState
              title="No processes yet"
              description="Import data to build your Process → Activity → Role → Skill model."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
