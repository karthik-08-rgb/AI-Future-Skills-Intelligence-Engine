import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { KnowledgeSource } from "../lib/types";
import { useFetch } from "../lib/hooks";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, percent } from "../components/ui";

export function KnowledgePage() {
  const { data, loading, error, reload } = useFetch(() => api.knowledge());
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await api.knowledgeUpload(form);
      setMessage(`Uploaded "${res.source?.title ?? f.name}" and indexed ${res.document ? "a document" : "content"}.`);
      reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this knowledge source and its documents?")) return;
    try {
      await api.knowledgeDelete(id);
      reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (loading) return <Spinner label="Loading knowledge…" />;
  if (error || !data) return <ErrorState message={error ?? "No data"} onRetry={reload} />;

  const sources = data.sources;

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Curated documents the AI assistant retrieves from when answering questions."
        action={
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept=".md,.txt,.pdf,.html,.json,.csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {message && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            message.includes("failed") || message.includes("invalid")
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      <Card>
        <CardHeader title="Knowledge sources" subtitle={`${sources.length} sources`} />
        {sources.length === 0 ? (
          <EmptyState title="No knowledge sources" description="Upload playbooks or briefings to improve assistant answers." />
        ) : (
          <div className="divide-y divide-slate-100">
            {sources.map((s: KnowledgeSource) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <Badge tone={s.status === "READY" ? "green" : s.status === "ERROR" ? "red" : "amber"}>
                      {s.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {s.source} · {s.documentType} · {s.chunkCount} chunks
                  </p>
                  {s.error && <p className="mt-1 text-xs text-rose-600">{s.error}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone="slate">trust {percent(s.trustLevel)}</Badge>
                </div>
                <button
                  onClick={() => onDelete(s.id)}
                  title="Delete"
                  className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
