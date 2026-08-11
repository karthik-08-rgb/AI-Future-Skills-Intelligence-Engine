import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import type { ReskillingEntry } from "../lib/types";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

export function ReskillingPage() {
  const { data, loading, error, reload } = useFetch(() => api.reskilling());

  if (loading) return <Spinner label="Loading reskilling analysis…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const entries = data.reskilling;

  return (
    <div>
      <PageHeader
        title="Reskilling"
        description="Which roles are most affected by AI transformation, and which future skills each role must develop to stay effective."
      />

      {entries.length === 0 ? (
        <Card>
          <EmptyState title="No reskilling data yet" />
        </Card>
      ) : (
        <div className="space-y-5">
          {entries.map((entry: ReskillingEntry) => (
            <Card key={entry.role.id}>
              <CardHeader
                title={
                  <Link to={`/roles/${entry.role.id}`} className="hover:text-brand-600">
                    {entry.role.name}
                  </Link>
                }
                subtitle={`${entry.affectedActivityCount}/${entry.activityCount} activities affected · ${entry.role.department ?? "No department"}`}
                action={
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{entry.score.toFixed(1)}</p>
                    <p className="text-[11px] text-slate-400">urgency /100</p>
                  </div>
                }
              />
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Required future skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.requiredFutureSkills.map((name) => {
                      const missing = entry.missingFutureSkills.includes(name);
                      return (
                        <Badge key={name} tone={missing ? "amber" : "green"}>
                          {name}
                          {missing ? " · gap" : ""}
                        </Badge>
                      );
                    })}
                  </div>

                  <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Affected activities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.affectedActivities.map((a) => (
                      <span
                        key={a.id}
                        title={a.processName}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:w-48">
                  <ComponentRow label="Skill gap" value={entry.skillGap} />
                  <ComponentRow label="Automation pressure" value={entry.components.automationPressure} />
                  <ComponentRow label="Future skill load" value={entry.components.futureSkillLoad} />
                  <ComponentRow label="Transformation impact" value={entry.components.transformationImpact} />
                  <Link to={`/roles/${entry.role.id}`} className="btn-secondary mt-2 w-full">
                    Role detail
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ComponentRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  );
}
