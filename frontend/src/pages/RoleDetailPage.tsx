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
  ScoreBar,
  Spinner,
  impactTone,
  percent,
} from "../components/ui";

export function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useFetch(() => api.roleIntelligence(id!), [id]);

  if (loading) return <Spinner label="Analyzing role…" />;
  if (error || !data) return <ErrorState message={error ?? "Role not found"} onRetry={reload} />;

  const role = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Explorer", to: "/explorer" }, { label: role.role.name }]} />
      <PageHeader
        title={role.role.name}
        description={role.role.description ?? "Role intelligence"}
        action={
          role.reskilling && (
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-600">{role.reskilling.score.toFixed(1)}</p>
              <p className="text-xs text-slate-400">reskilling urgency</p>
            </div>
          )
        }
      />

      {role.missingFutureSkills.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Missing future skills</p>
          <p className="mt-0.5 text-sm text-amber-700">
            {role.missingFutureSkills.join(", ")}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Current skills" subtitle="Skills the role relies on today" />
          <div className="divide-y divide-slate-100">
            {role.currentSkills.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.category}</p>
                </div>
                <div className="w-32">
                  <p className="mb-0.5 text-right text-[11px] text-slate-400">
                    proficiency {percent(s.proficiency)}
                  </p>
                  <ScoreBar value={s.proficiency * 100} />
                </div>
              </div>
            ))}
            {role.currentSkills.length === 0 && <EmptyState title="No skills mapped" />}
          </div>
        </Card>

        <Card>
          <CardHeader title="Required future skills" subtitle="Capabilities this role must build" />
          <div className="divide-y divide-slate-100">
            {role.requiredFutureSkills.map((fs) => {
              const gap = role.skillGaps.find((g) => g.futureSkillId === fs.id);
              return (
                <div key={fs.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{fs.name}</p>
                    <Badge tone={gap?.missing ? "amber" : "green"}>
                      {gap?.missing ? `gap ${percent(fs.currentGap)}` : "covered"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{fs.category}</p>
                  <div className="mt-1.5">
                    <ScoreBar value={fs.priority * 100} />
                  </div>
                </div>
              );
            })}
            {role.requiredFutureSkills.length === 0 && <EmptyState title="No future skills mapped" />}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Skill impact" subtitle="How AI changes demand for each skill in this role" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Skill</th>
                  <th className="px-5 py-3 font-medium">Impact</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {role.skillImpacts.map((si) => (
                  <tr key={si.skillId}>
                    <td className="px-5 py-3 font-medium text-slate-800">{si.skillName}</td>
                    <td className="px-5 py-3">
                      <Badge tone={impactTone(si.impactType)}>{si.impactType}</Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{si.impactScore.toFixed(1)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{si.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Affected activities" subtitle="Activities where AI automation or augmentation applies" />
          <div className="divide-y divide-slate-100">
            {role.affectedActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.name}</p>
                  <Link to={`/processes/${a.processId}`} className="text-xs text-brand-600 hover:underline">
                    {a.processName}
                  </Link>
                </div>
                <div className="flex w-40 items-center gap-2 text-[11px] text-slate-400">
                  <span className="w-14">auto {percent(a.automationPotential)}</span>
                  <span>aug {percent(a.augmentationPotential)}</span>
                </div>
              </div>
            ))}
            {role.affectedActivities.length === 0 && <EmptyState title="No affected activities" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
