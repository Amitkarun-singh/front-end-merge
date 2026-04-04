import { config } from "../../app.config.js";

const BASE_URL = config.historyServer;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecentQuery {
  query: string;
  tool: string;
  time: string;
  conversation_id?: string | number; // used to open full conversation view
  url?: string;                      // route to navigate to when clicked
  [key: string]: unknown;
}

// ─── Conversation types ───────────────────────────────────────────────────────
export interface ConversationMessage {
  role: "user" | "assistant" | "ai";
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: string | number;
  title: string;
  tool: string;
  messages: ConversationMessage[];
  created_at?: string;
  turn_count?: number;
}

export interface FeatureExplored {
  name: string;
  usageCount: number;
  lastUsed: string;
  [key: string]: unknown;
}

export interface LoginRecord {
  date: string;
  time: string;
  device: string;
  location: string;
  [key: string]: unknown;
}

export interface WeekActivity {
  day: string;
  active: boolean;
  count?: number;
}

export interface HistoryStats {
  totalQueries?: number;
  totalLogins?: number;
  activeDays?: number;
  featuresUsed?: number;
  [key: string]: unknown;
}

// ─── Tool → Route map ────────────────────────────────────────────────────────
const toolRouteMap: Record<string, string> = {
  "ai gini":        "/ai-gini",
  "ai notes":       "/ai-notes",
  "ai tutor":       "/ai-tutor",
  "ai practice":    "/ai-practice",
  "doc summariser": "/summarizer",
  "summarizer":     "/summarizer",
  "question bank":  "/question-bank",
  "more tools":     "/more-tools",
};

function getToolRoute(tool: string): string {
  const lower = (tool || "").toLowerCase();
  for (const [key, route] of Object.entries(toolRouteMap)) {
    if (lower.includes(key)) return route;
  }
  return "/ai-gini";
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseQuery(raw: any): RecentQuery {
  // Real API shape: { title, source, redirect_to, conversation_id, time, subject, class, turn_count }
  const query =
    raw.title          ||   // ← "what is fractional formula"
    raw.query          ||
    raw.question       ||
    raw.message        ||
    raw.content        ||
    raw.text           ||
    raw.user_query     ||
    "Unknown query";

  const tool =
    raw.source         ||   // ← "AI Gini" / "AI Practice"
    raw.tool           ||
    raw.feature        ||
    raw.feature_name   ||
    raw.tool_name      ||
    raw.category       ||
    "AI Gini";

  // time already human-readable ("9 hours ago", "Yesterday") – use as-is
  const time =
    raw.time           ||
    raw.created_at     ||
    raw.timestamp      ||
    raw.date           ||
    "";

  const conversation_id =
    raw.conversation_id ??
    raw.conversationId  ??
    raw.chat_id         ??
    raw.session_id      ??
    undefined;

  // Use redirect_to from API directly (already the correct route)
  const url = raw.redirect_to || getToolRoute(tool);

  return { ...raw, query, tool, time, conversation_id, url };
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseFeature(raw: any): FeatureExplored {
  const name =
    raw.name         ||
    raw.feature_name ||
    raw.feature      ||
    raw.tool         ||
    raw.tool_name    ||
    "Feature";

  const usageCount =
    raw.usageCount   ??
    raw.usage_count  ??
    raw.count        ??
    raw.total        ??
    raw.uses         ??
    0;

  const lastUsed =
    raw.lastUsed     ||
    raw.last_used    ||
    raw.last_accessed||
    raw.time         ||
    raw.updated_at   ||
    raw.created_at   ||
    "";

  return { ...raw, name, usageCount, lastUsed };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseLogin(raw: any): LoginRecord {
  const date =
    raw.date         ||
    raw.login_date   ||
    raw.created_at   ||
    raw.logged_at    ||
    raw.timestamp    ||
    "";

  const time =
    raw.time         ||
    raw.login_time   ||
    raw.logged_time  ||
    "";

  const device =
    raw.device       ||
    raw.device_type  ||
    raw.user_agent   ||
    raw.browser      ||
    "Unknown";

  const location =
    raw.location     ||
    raw.ip_address   ||
    raw.ip           ||
    raw.city         ||
    raw.country      ||
    "Unknown";

  return { ...raw, date, time, device, location };
}

// ─── Normalise stats ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseStats(raw: any): HistoryStats {
  return {
    ...raw,
    totalQueries: raw.totalQueries ?? raw.total_queries ?? raw.queries  ?? raw.query_count  ?? undefined,
    totalLogins:  raw.totalLogins  ?? raw.total_logins  ?? raw.logins   ?? raw.login_count  ?? undefined,
    activeDays:   raw.activeDays   ?? raw.active_days   ?? raw.days     ?? raw.day_count    ?? undefined,
    featuresUsed: raw.featuresUsed ?? raw.features_used ?? raw.features ?? raw.feature_count?? undefined,
  };
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string, token: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[historyApi] GET ${url}`);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json().catch(() => ({}));

  // Log raw response for debugging
  console.log(`[historyApi] ${endpoint} raw response:`, json);

  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new Error((json as any).message || `HTTP ${res.status}`);
  }

  // Unwrap common envelope shapes: { data: [...] } or { data: { ... } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unwrapped = (json as any).data ?? json;
  console.log(`[historyApi] ${endpoint} unwrapped:`, unwrapped);

  return unwrapped as T;
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function fetchRecentQueries(token: string): Promise<RecentQuery[]> {
  const raw = await apiFetch<unknown[]>("/api/history/recent-queries", token);
  const arr = Array.isArray(raw) ? raw : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((r: any) => normaliseQuery(r));
}

export async function fetchFeaturesExplored(token: string): Promise<FeatureExplored[]> {
  const raw = await apiFetch<unknown[]>("/api/history/features-explored", token);
  const arr = Array.isArray(raw) ? raw : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((r: any) => normaliseFeature(r));
}

export async function fetchLoginHistory(token: string): Promise<LoginRecord[]> {
  const raw = await apiFetch<unknown[]>("/api/history/login-history", token);
  const arr = Array.isArray(raw) ? raw : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((r: any) => normaliseLogin(r));
}

export async function fetchWeekActivity(token: string): Promise<WeekActivity[]> {
  const raw = await apiFetch<unknown>("/api/history/week-activity", token);
  // Accept array or object with various keys
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = raw as any;
  const arr = Array.isArray(raw)
    ? raw
    : r.days || r.activity || r.week || r.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((item: any): WeekActivity => ({
    day:    item.day    ?? item.name   ?? item.label ?? "",
    active: item.active !== undefined ? Boolean(item.active) : (item.count ?? 0) > 0,
    count:  item.count  ?? item.sessions ?? 0,
  }));
}

export async function fetchHistoryStats(token: string): Promise<HistoryStats> {
  const raw = await apiFetch<HistoryStats>("/api/history/stats", token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return normaliseStats(raw as any);
}

/**
 * Fetch full conversation messages for a given conversation_id.
 * Pass ?source=gini or ?source=practice as needed.
 */
export async function fetchConversation(
  token: string,
  conversationId: string | number,
  source?: string,
): Promise<Conversation> {
  const qs = source ? `?source=${encodeURIComponent(source)}` : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(`/api/history/conversation/${conversationId}${qs}`, token);

  // Normalise messages array from various shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMessages: any[] = raw.messages ?? raw.conversation ?? raw.chats ?? raw.data ?? [];

  const messages: ConversationMessage[] = rawMessages.map((m: any) => ({
    role: m.role === "user" || m.role === "human" ? "user" : "assistant",
    content: m.content ?? m.message ?? m.text ?? m.response ?? "",
    timestamp: m.timestamp ?? m.created_at ?? m.time ?? undefined,
  }));

  return {
    id: conversationId,
    title: raw.title ?? raw.name ?? "Conversation",
    tool: raw.tool ?? raw.source ?? raw.feature ?? "AI Gini",
    messages,
    created_at: raw.created_at ?? raw.started_at ?? raw.date ?? undefined,
    turn_count: raw.turn_count ?? raw.turnCount ?? undefined,
  };
}
