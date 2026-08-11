import type {
  AssistantInteraction,
  AssistantResponse,
  AuthResponse,
  CatalogProcess,
  CatalogRole,
  CatalogSkill,
  Dashboard,
  DecliningSkill,
  ExplorerProcess,
  FutureSkill,
  ImportPreview,
  ImportRecord,
  Industry,
  KnowledgeSource,
  Organization,
  ProcessIntelligence,
  Recommendation,
  RecommendationDetail,
  ReskillingEntry,
  RoleIntelligence,
  User,
} from "./types";

const TOKEN_KEY = "afs_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "API_ERROR", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!isForm) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code = "API_ERROR";
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
      if (body?.error?.code) code = body.error.code;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(message, code, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (body: { name: string; email: string; password: string; organizationName: string; industryId?: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  me: () => request<{ user: User; organization: Organization | null }>("/auth/me"),

  organization: () => request<{ organization: Organization; members: User[] }>("/auth/organization"),

  // Meta
  industries: () => request<{ industries: Industry[] }>("/meta/industries"),

  // Catalog
  roles: () => request<{ roles: CatalogRole[] }>("/roles"),
  processes: () => request<{ processes: CatalogProcess[] }>("/processes"),
  skills: (isFuture?: boolean) =>
    request<{ skills: CatalogSkill[] }>(`/skills${isFuture ? "?isFuture=true" : ""}`),
  futureSkillsCatalog: () => request<{ futureSkills: FutureSkill[] }>("/future-skills"),
  explorer: () => request<{ processes: ExplorerProcess[] }>("/explorer"),

  // Intelligence
  dashboard: () => request<Dashboard>("/intelligence/dashboard"),
  futureSkills: (limit?: number) =>
    request<{ futureSkills: FutureSkill[] }>(
      `/intelligence/future-skills${limit ? `?limit=${limit}` : ""}`,
    ),
  decliningSkills: () => request<{ decliningSkills: DecliningSkill[] }>("/intelligence/declining-skills"),
  reskilling: () => request<{ reskilling: ReskillingEntry[] }>("/intelligence/reskilling"),
  roleIntelligence: (id: string) => request<RoleIntelligence>(`/intelligence/role/${id}`),
  processIntelligence: (id: string) => request<ProcessIntelligence>(`/intelligence/process/${id}`),
  recompute: () => request<{ ok: boolean }>("/intelligence/recompute", { method: "POST" }),

  // Recommendations
  recommendations: (limit?: number) =>
    request<{ recommendations: Recommendation[] }>(
      `/recommendations${limit ? `?limit=${limit}` : ""}`,
    ),
  recommendationDetail: (id: string) => request<RecommendationDetail>(`/recommendations/${id}`),

  // Assistant
  assistantQuery: (question: string) =>
    request<AssistantResponse>("/assistant/query", { method: "POST", body: JSON.stringify({ question }) }),
  assistantInteractions: () =>
    request<{ interactions: AssistantInteraction[] }>("/assistant/interactions"),

  // Knowledge
  knowledge: () => request<{ sources: KnowledgeSource[] }>("/knowledge"),
  knowledgeUpload: (form: FormData) =>
    request<{ source?: KnowledgeSource; document?: unknown }>("/knowledge/upload", {
      method: "POST",
      body: form,
    }),
  knowledgeDelete: (id: string) => request<void>(`/knowledge/${id}`, { method: "DELETE" }),

  // Data import
  imports: () => request<{ imports: ImportRecord[] }>("/data/imports"),
  importPreview: (entityType: string, filename: string, content: string) =>
    request<ImportPreview>("/data/import/upload", {
      method: "POST",
      body: buildForm(entityType, filename, content),
    }),
  importExecute: (entityType: string, filename: string, content: string) =>
    request<ImportRecord>("/data/import", {
      method: "POST",
      body: JSON.stringify({ entityType, filename, content }),
    }),
};

function buildForm(entityType: string, filename: string, content: string): FormData {
  const form = new FormData();
  form.append("entityType", entityType);
  form.append("file", new Blob([content], { type: "text/csv" }), filename);
  return form;
}
