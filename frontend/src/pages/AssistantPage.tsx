import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, Send, User } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { AssistantResponse } from "../lib/types";
import { Badge, Card, PageHeader, Spinner } from "../components/ui";

interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: AssistantResponse;
}

const SUGGESTIONS = [
  "Which future skills should a QA Engineer learn?",
  "What is the reskilling urgency for DevOps Engineer?",
  "Which processes will be most automated by AI?",
  "What skills are declining fastest in our organization?",
  "Recommend a training plan for Data Analysts.",
];

export function AssistantPage() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  async function send(question: string) {
    if (!question.trim() || thinking) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setThinking(true);
    try {
      const res = await api.assistantQuery(question.trim());
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, meta: res }]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "The assistant could not respond.";
      setError(message);
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setThinking(false);
    }
  }

  useEffect(() => {
    if (initialSent.current) return;
    const q = searchParams.get("q");
    if (q) {
      initialSent.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about future skills, role impact, and reskilling — answered from your organization's intelligence model."
      />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !thinking && (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Bot size={22} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">Ask about your skills intelligence</p>
              <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.meta && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
                    <Badge tone="slate">{m.meta.provider}</Badge>
                    {m.meta.model && <Badge tone="slate">{m.meta.model}</Badge>}
                    {m.meta.degraded && <Badge tone="amber">template fallback</Badge>}
                    {m.meta.sources && m.meta.sources.length > 0 && (
                      <span className="text-[11px] text-slate-400">
                        sources: {m.meta.sources.map((s) => s.title).join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Bot size={15} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Spinner label="Analyzing…" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-200 p-4">
          <input
            className="input"
            placeholder="Ask about future skills, role impact, reskilling…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={thinking}
          />
          <button type="submit" disabled={thinking || !input.trim()} className="btn-primary shrink-0">
            <Send size={15} />
            Send
          </button>
        </form>
      </Card>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
