import { useParams } from "react-router-dom";
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
} from "../components/ui";

const LEVEL_ICON: Record<string, string> = {
  role: "👤",
  ai_impact: "🤖",
  score: "📊",
  process: "⚙️",
  future_skill: "🎯",
};

export function RecommendationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useFetch(() => api.recommendationDetail(id!), [id]);

  if (loading) return <Spinner label="Loading recommendation…" />;
  if (error || !data) return <ErrorState message={error ?? "Not found"} onRetry={reload} />;

  const rec = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Recommendations", to: "/recommendations" }, { label: rec.title }]} />
      <PageHeader
        title={rec.title}
        description={rec.description}
        action={
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{rec.score.toFixed(1)}</p>
            <p className="text-xs text-slate-400">score /100</p>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Reasoning chain" subtitle="How this recommendation was derived" />
            <ol className="relative space-y-4 px-5 py-5">
              {rec.reasoningChain.map((step, i) => (
                <li key={i} className="relative flex gap-3">
                  {i < rec.reasoningChain.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-[calc(100%+6px)] w-px bg-slate-200" />
                  )}
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
                    {LEVEL_ICON[step.level] ?? "•"}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-800">{step.label}</p>
                    {step.detail && <p className="text-xs text-slate-500">{step.detail}</p>}
                    {step.score !== undefined && (
                      <div className="mt-1.5 max-w-xs">
                        <ScoreBar value={step.score} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Evidence" subtitle={`${rec.evidence.length} supporting evidence items`} />
            {rec.evidence.length === 0 ? (
              <EmptyState title="No evidence captured" />
            ) : (
              <div className="divide-y divide-slate-100">
                {rec.evidence.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{ev.label}</p>
                      {ev.detail && <p className="text-xs text-slate-500">{ev.detail}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone="slate">{ev.sourceType}</Badge>
                      {ev.score !== null && ev.score !== undefined && (
                        <span className="text-xs font-semibold text-slate-700">{ev.score.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Summary" />
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Type</span>
                <Badge tone="brand">{rec.type.replace("_", " ")}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <Badge tone="slate">{rec.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Confidence</span>
                <span className="font-semibold text-slate-800">{Math.round(rec.confidence * 100)}%</span>
              </div>
              {rec.role && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Role</span>
                  <span className="font-semibold text-slate-800">{rec.role.name}</span>
                </div>
              )}
              {rec.futureSkill && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Future skill</span>
                  <span className="font-semibold text-slate-800">{rec.futureSkill.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-700">
                  {new Date(rec.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
