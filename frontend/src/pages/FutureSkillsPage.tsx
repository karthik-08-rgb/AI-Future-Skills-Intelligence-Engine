import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import type { FutureSkill } from "../lib/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, ScoreBar, Spinner } from "../components/ui";

export function FutureSkillsPage() {
  const { data, loading, error, reload } = useFetch(() => api.futureSkills());
  const [selected, setSelected] = useState<FutureSkill | null>(null);
  const navigate = useNavigate();

  if (loading) return <Spinner label="Loading future skills…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const skills = data.futureSkills;

  return (
    <div>
      <PageHeader
        title="Future Skills"
        description="Capabilities your organization needs as AI transforms work — scored by AI demand, process impact, role relevance, and current skill gaps."
      />

      {skills.length === 0 ? (
        <Card>
          <EmptyState
            title="No future skills found"
            description="Import data or recompute intelligence to generate future-skill analysis."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {skills.map((fs) => (
            <Card key={fs.futureSkillId} className="flex flex-col">
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button
                      onClick={() => setSelected(fs)}
                      className="text-left text-base font-semibold text-slate-900 hover:text-brand-600"
                    >
                      {fs.name}
                    </button>
                    <div className="mt-1.5">
                      <Badge tone="brand">{fs.category}</Badge>
                      <Badge tone="slate">{Math.round(fs.confidence * 100)}% confidence</Badge>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{fs.finalScore.toFixed(1)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-500">{fs.description}</p>
                <div className="mt-3">
                  <ScoreBar value={fs.finalScore} />
                </div>
              </div>
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Relevant roles: <span className="text-slate-600">{fs.roles.join(", ") || "—"}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSelected(null)}>
          <Card
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selected.name}</h3>
                    <div className="mt-1.5">
                      <Badge tone="brand">{selected.category}</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-slate-600">{selected.description}</p>

                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-slate-800">Overall score</p>
                    <p className="text-2xl font-bold text-slate-900">{selected.finalScore.toFixed(1)}/100</p>
                  </div>
                  <ScoreBar value={selected.finalScore} />
                </div>

                <div className="mt-5 space-y-3">
                  {componentRows(selected).map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="font-medium text-slate-800">{row.value.toFixed(1)}</span>
                      </div>
                      <ScoreBar value={row.value} />
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Relevant roles</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.roles.map((role) => (
                      <Badge key={role} tone="slate">
                        {role}
                      </Badge>
                    ))}
                    {selected.roles.length === 0 && <span className="text-xs text-slate-400">No roles mapped</span>}
                  </div>
                </div>

                <button
                  className="btn-primary mt-6 w-full"
                  onClick={() => {
                    setSelected(null);
                    navigate(`/assistant?q=${encodeURIComponent(`What should we invest in for ${selected.name}?`)}`);
                  }}
                >
                  Ask the assistant about this skill
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function componentRows(fs: FutureSkill) {
  const c = fs.components;
  return [
    { label: "AI demand", value: c.aiDemand },
    { label: "Process impact", value: c.processImpact },
    { label: "Role relevance", value: c.roleRelevance },
    { label: "Skill gap", value: c.skillGap },
    { label: "Industry relevance", value: c.industryRelevance },
    { label: "Transformation impact", value: c.transformationImpact },
  ];
}
