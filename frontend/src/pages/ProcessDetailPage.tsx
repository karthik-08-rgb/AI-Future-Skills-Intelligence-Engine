import { Link, useParams } from "react-router-dom";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import { Breadcrumb } from "../components/Layout";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  impactTone,
  percent,
} from "../components/ui";

export function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useFetch(() => api.processIntelligence(id!), [id]);

  if (loading) return <Spinner label="Analyzing process…" />;
  if (error || !data) return <ErrorState message={error ?? "Process not found"} onRetry={reload} />;

  const process = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Explorer", to: "/explorer" }, { label: process.process.name }]} />
      <PageHeader
        title={process.process.name}
        description={process.process.description ?? "Process intelligence"}
        action={
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">
                {process.impact.transformationScore?.toFixed(1) ?? "—"}
              </p>
              <p className="text-xs text-slate-400">transformation /100</p>
            </div>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Process overview" />
          <div className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Automation potential</span>
              <span className="font-semibold text-slate-800">
                {percent(process.impact.automationPotential ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Augmentation potential</span>
              <span className="font-semibold text-slate-800">
                {percent(process.impact.augmentationPotential ?? 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Affected roles" />
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {process.affectedRoles.map((r) => (
              <Link
                key={r.id}
                to={`/roles/${r.id}`}
                className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                {r.name}
              </Link>
            ))}
            {process.affectedRoles.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Affected skills" />
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {process.affectedSkills.map((s) => (
              <Badge key={s.id} tone={s.impactType ? impactTone(s.impactType) : "slate"}>
                {s.name}
              </Badge>
            ))}
            {process.affectedSkills.length === 0 && <p className="text-xs text-slate-400">None</p>}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Activities" subtitle="Automation & augmentation potential per activity" />
          <div className="divide-y divide-slate-100">
            {process.activities.map((a) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.name}</p>
                    {a.description && <p className="text-xs text-slate-400">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      auto {percent(a.automationPotential)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                      aug {percent(a.augmentationPotential)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      human {percent(a.humanDependency)}
                    </span>
                  </div>
                </div>
                {a.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.skills.map((s) => (
                      <span key={s.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
                {a.roles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {a.roles.map((r) => (
                      <Link
                        key={r.id}
                        to={`/roles/${r.id}`}
                        className="text-[11px] font-medium text-brand-600 hover:underline"
                      >
                        {r.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {process.activities.length === 0 && <EmptyState title="No activities" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
