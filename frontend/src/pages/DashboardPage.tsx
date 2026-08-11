import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Building2,
  Lightbulb,
  Network,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import { Card, CardHeader, EmptyState, ErrorState, ScoreBar, Spinner } from "../components/ui";
import { useState } from "react";

const PIE_COLORS: Record<string, string> = {
  "AI-Augmented": "#3383ff",
  Changing: "#f59e0b",
  Declining: "#ef4444",
  "Enduring Human Capability": "#8b5cf6",
  Increasing: "#10b981",
};

export function DashboardPage() {
  const { data, loading, error, reload } = useFetch(() => api.dashboard());
  const [recomputing, setRecomputing] = useState(false);

  async function onRecompute() {
    setRecomputing(true);
    try {
      await api.recompute();
      reload();
    } finally {
      setRecomputing(false);
    }
  }

  if (loading) return <Spinner label="Computing dashboard…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const pieData = Object.entries(data.impactDistribution).map(([name, value]) => ({ name, value }));
  const processData = data.processTransformation.map((p) => ({
    name: p.processName,
    score: p.transformationScore,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI impact and future-skill readiness across your organization.
          </p>
        </div>
        <button onClick={onRecompute} disabled={recomputing} className="btn-secondary">
          <RefreshCw size={15} className={recomputing ? "animate-spin" : ""} />
          Recompute intelligence
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={<Workflow size={20} />} label="Roles" value={data.totals.roles} to="/explorer" />
        <StatTile icon={<Sparkles size={20} />} label="Skills" value={data.totals.skills} to="/explorer" />
        <StatTile icon={<Network size={20} />} label="Processes" value={data.totals.processes} to="/explorer" />
        <StatTile
          icon={<Lightbulb size={20} />}
          label="Recommendations"
          value={data.totals.recommendations}
          to="/recommendations"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Affected roles</p>
            <Users size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {data.affectedRoles}
            <span className="ml-1 text-sm font-normal text-slate-400">of {data.totals.roles}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">roles with AI-affected activities</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">High reskilling need</p>
            <TrendingUp size={18} className="text-rose-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.highReskillingRoles}</p>
          <p className="mt-1 text-xs text-slate-400">roles scoring ≥ 70 reskilling urgency</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Emerging skills</p>
            <Sparkles size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.emergingSkills}</p>
          <p className="mt-1 text-xs text-slate-400">
            <span className="text-rose-500">{data.decliningSkills} declining</span> · {data.augmentedSkills}{" "}
            augmented
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Top Future Skills"
            subtitle="Highest composite AI & workforce demand scores"
            action={
              <Link to="/future-skills" className="text-sm font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100 px-5 py-2">
            {data.topFutureSkills.slice(0, 5).map((fs) => (
              <div key={fs.futureSkillId} className="py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{fs.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{fs.category}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{fs.finalScore.toFixed(1)}</span>
                </div>
                <ScoreBar value={fs.finalScore} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Skill Impact Distribution"
            subtitle="How AI changes demand for current skills"
            action={
              <Link to="/declining-skills" className="text-sm font-medium text-brand-600 hover:underline">
                View details
              </Link>
            }
          />
          <div className="flex items-center gap-6 px-5 py-4">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5">
              {pieData.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: PIE_COLORS[entry.name] ?? "#94a3b8" }}
                  />
                  <span className="flex-1 text-slate-600">{entry.name}</span>
                  <span className="font-semibold text-slate-800">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Process Transformation"
            subtitle="Share of each process affected by automation / augmentation"
            action={
              <Link to="/explorer" className="text-sm font-medium text-brand-600 hover:underline">
                Explore
              </Link>
            }
          />
          <div className="h-56 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}/100`, "Transformation score"]} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {processData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 50 ? "#1a5ff5" : "#59a6ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Role Reskilling Urgency"
            subtitle="Highest-priority roles for future-skill development"
            action={
              <Link to="/reskilling" className="text-sm font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100 px-5 py-2">
            {data.reskillingByRole.slice(0, 5).map((r) => (
              <div key={r.roleId} className="py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <Link to={`/roles/${r.roleId}`} className="text-sm font-medium text-slate-800 hover:text-brand-600">
                    {r.roleName}
                  </Link>
                  <span className="text-sm font-bold text-slate-900">{r.score.toFixed(1)}</span>
                </div>
                <ScoreBar value={r.score} />
              </div>
            ))}
            {data.reskillingByRole.length === 0 && <EmptyState title="No reskilling data" />}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Top Recommendations"
            subtitle="Actions to close future-skill gaps"
            action={
              <Link to="/recommendations" className="text-sm font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          {data.topRecommendations.length === 0 ? (
            <EmptyState title="No recommendations yet" description="Recompute intelligence to generate them." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.topRecommendations.slice(0, 4).map((rec) => (
                <Link
                  key={rec.id}
                  to={`/recommendations/${rec.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{rec.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{rec.score.toFixed(1)}</p>
                    <p className="text-[11px] text-slate-400">/100</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <Building2 size={14} />
        All figures computed from your organization's Process → Activity → Role → Skill → AI Impact → Future
        Skill model.
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  to: string;
}) {
  return (
    <Link to={to} className="card block p-5 transition-colors hover:border-brand-300 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <div className="text-brand-600">{icon}</div>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
    </Link>
  );
}
