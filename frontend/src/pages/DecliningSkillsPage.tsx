import { Link } from "react-router-dom";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import type { DecliningSkill } from "../lib/types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  impactTone,
  percent,
  Spinner,
} from "../components/ui";

export function DecliningSkillsPage() {
  const { data, loading, error, reload } = useFetch(() => api.decliningSkills());

  if (loading) return <Spinner label="Loading declining skills…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const skills = data.decliningSkills;

  return (
    <div>
      <PageHeader
        title="Declining Skills"
        description="Current skills whose demand is expected to fall as AI automates or augments the underlying work — and the future capabilities to transition people toward."
      />

      {skills.length === 0 ? (
        <Card>
          <EmptyState title="No declining skills found" />
        </Card>
      ) : (
        <div className="space-y-4">
          {skills.map((s: DecliningSkill) => (
            <Card key={s.skillId}>
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{s.skillName}</h3>
                    <Badge tone={impactTone(s.impactType)}>{s.impactType}</Badge>
                    <Badge tone="slate">{s.category}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{s.reason}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Metric label="Automation potential" value={percent(s.automationPotential)} />
                    <Metric label="Augmentation" value={percent(s.augmentationPotential)} />
                    <Metric label="Human dependency" value={percent(s.humanDependency)} />
                  </div>

                  {s.roles.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Used by</span>
                      {s.roles.map((role) => (
                        <Link
                          key={role.id}
                          to={`/roles/${role.id}`}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                        >
                          {role.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:w-44">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Impact</span>
                    <span className="text-xl font-bold text-rose-600">{s.impactScore.toFixed(1)}</span>
                  </div>
                  <div className="mt-2">
                    <ScoreBarRed value={s.impactScore} />
                  </div>
                  {s.transitionTo && (
                    <div className="mt-4 rounded-lg bg-brand-50 p-3">
                      <p className="text-xs font-semibold text-brand-700">Transition to</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-800">{s.transitionTo}</p>
                      {s.transitionReason && (
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">{s.transitionReason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ScoreBarRed({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
