import { Link } from "react-router-dom";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import type { Recommendation } from "../lib/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

const TYPE_TONE: Record<string, "brand" | "green" | "amber" | "violet"> = {
  RESKILLING: "amber",
  UPSKILLING: "brand",
  NEW_SKILL: "green",
  TRAINING: "violet",
};

export function RecommendationsPage() {
  const { data, loading, error, reload } = useFetch(() => api.recommendations());

  if (loading) return <Spinner label="Loading recommendations…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const recommendations = data.recommendations;

  return (
    <div>
      <PageHeader
        title="Recommendations"
        description="Prioritized actions to close future-skill gaps, with transparent reasoning chains and evidence."
      />

      {recommendations.length === 0 ? (
        <Card>
          <EmptyState
            title="No recommendations yet"
            description="Recompute intelligence from the dashboard to generate recommendations."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec: Recommendation) => (
            <Link key={rec.id} to={`/recommendations/${rec.id}`} className="card block transition-colors hover:border-brand-300">
              <div className="flex flex-wrap items-center gap-4 p-5">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{rec.title}</h3>
                    <Badge tone={TYPE_TONE[rec.type] ?? "slate"}>{rec.type.replace("_", " ")}</Badge>
                    {rec.status && <Badge tone="slate">{rec.status}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{rec.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {rec.role?.name && <span className="font-medium text-slate-600">Role: {rec.role.name}</span>}
                    {rec.futureSkill?.name && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-slate-600">Skill: {rec.futureSkill.name}</span>
                      </>
                    )}
                    {rec._count?.evidence !== undefined && (
                      <>
                        <span>·</span>
                        <span>{rec._count.evidence} evidence items</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">{rec.score.toFixed(1)}</p>
                    <p className="text-[11px] text-slate-400">score</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{Math.round(rec.confidence * 100)}%</p>
                    <p className="text-[11px] text-slate-400">confidence</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
