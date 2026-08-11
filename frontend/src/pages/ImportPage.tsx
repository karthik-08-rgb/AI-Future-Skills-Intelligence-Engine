import { useRef, useState } from "react";
import { FileUp, RefreshCw, Upload } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { ImportPreview, ImportRecord } from "../lib/types";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Spinner } from "../components/ui";

const ENTITY_TYPES = [
  { value: "role-skills", label: "Role–Skill mapping" },
  { value: "skills", label: "Skills" },
  { value: "roles", label: "Roles" },
  { value: "activities", label: "Activities" },
];

const TEMPLATES: Record<string, string> = {
  "role-skills": "role,skill\nSoftware Engineer,Python\nQA Engineer,Test Automation",
  skills: "name,category,isFuture\nPython,Technical,false",
  roles: "name,department,description\nData Analyst,Data & Analytics,Turns data into insight",
  activities: "process,name,description\nSoftware Development,Requirements Analysis,Gathering specs",
};

export function ImportPage() {
  const [entityType, setEntityType] = useState("role-skills");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [imports, setImports] = useState<ImportRecord[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadImports() {
    try {
      const res = await api.imports();
      setImports(res.imports);
    } catch {
      setImports([]);
    }
  }

  function onFileSelected(f: File | null) {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? "");
        setText(content);
      };
      reader.readAsText(f);
    }
  }

  async function runPreview() {
    setError(null);
    setSuccess(null);
    const content = file ? text : text;
    if (!content.trim()) {
      setError("Provide CSV/JSON content or select a file.");
      return;
    }
    try {
      const res = await api.importPreview(entityType, file?.name ?? "import.csv", content);
      setPreview(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Preview failed");
    }
  }

  async function runImport() {
    if (!preview) return;
    setError(null);
    setSuccess(null);
    setImporting(true);
    try {
      const res = await api.importExecute(entityType, preview.filename, text);
      setSuccess(`Import completed — ${res.validRows} valid rows committed (${res.duplicateRows} duplicates skipped).`);
      setPreview(null);
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      loadImports();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Import"
        description="Upload CSV/JSON to populate roles, skills, and role–skill mappings, then recompute intelligence."
        action={
          imports === null ? null : (
            <button onClick={loadImports} className="btn-secondary">
              <RefreshCw size={14} />
              Refresh history
            </button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="New import" subtitle="Preview validates rows before committing" />
          <div className="space-y-4 p-5">
            <div>
              <label className="label">Entity type</label>
              <select
                className="input"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPreview(null);
                }}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">CSV / JSON file</label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={22} className="text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {file ? file.name : "Click to choose a file"}
                </p>
                <p className="text-xs text-slate-400">CSV or JSON, up to 2 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div>
              <label className="label">Or paste content</label>
              <textarea
                className="input min-h-32 font-mono text-xs"
                placeholder={TEMPLATES[entityType]}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            {success && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
            )}

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={runPreview} disabled={!text.trim()}>
                <FileUp size={15} />
                Preview
              </button>
              <button className="btn-primary flex-1" onClick={runImport} disabled={!preview || importing}>
                {importing ? "Importing…" : "Commit import"}
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {preview ? (
            <Card>
              <CardHeader
                title="Validation preview"
                subtitle={`${preview.filename} · ${preview.totalRows} rows`}
                action={
                  <div className="flex gap-2">
                    <Badge tone="green">{preview.validRows} valid</Badge>
                    <Badge tone="red">{preview.invalidRows} invalid</Badge>
                    <Badge tone="amber">{preview.duplicateRows} dupes</Badge>
                  </div>
                }
              />
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2 font-medium">#</th>
                      {preview.columns.map((c) => (
                        <th key={c} className="px-4 py-2 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.preview.map((row) => (
                      <tr key={row.index}>
                        <td className="px-4 py-2 text-slate-400">{row.index}</td>
                        {preview.columns.map((c) => (
                          <td key={c} className="px-4 py-2 text-slate-700">
                            {row.data[c] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.errors.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Errors</p>
                  <ul className="space-y-1 text-xs text-rose-600">
                    {preview.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardHeader title="Import history" />
              {imports === null ? (
                <div className="p-5">
                  <Spinner label="Loading history…" />
                </div>
              ) : imports.length === 0 ? (
                <EmptyState title="No imports yet" />
              ) : (
                <div className="max-h-96 divide-y divide-slate-100 overflow-auto">
                  {imports.map((imp) => (
                    <div key={imp.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{imp.filename}</p>
                          <p className="text-xs text-slate-400">
                            {imp.entityType} · {imp.validRows} valid · {imp.invalidRows} invalid ·{" "}
                            {imp.duplicateRows} dupes
                          </p>
                        </div>
                        <Badge
                          tone={
                            imp.status === "COMPLETED" ? "green" : imp.status === "FAILED" ? "red" : "amber"
                          }
                        >
                          {imp.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
