import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  MessageCircle,
  FileText,
  GraduationCap,
  ClipboardList,
  FileSearch,
  Grid3X3,
  Calendar,
  LogIn,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  BookOpen,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  fetchRecentQueries,
  fetchFeaturesExplored,
  fetchLoginHistory,
  fetchLatestTests,          // ← new
  RecentQuery,
  FeatureExplored,
  LoginRecord,
  LatestTest,                // ← new
} from "@/api/historyApi";

// ─── Tool → Icon map ──────────────────────────────────────────────────────────
const toolIconMap: Record<string, React.ElementType> = {
  "AI Gini":        MessageCircle,
  "AI Notes":       FileText,
  "AI Tutor":       GraduationCap,
  "AI Practice":    ClipboardList,
  "Doc Summariser": FileSearch,
  "More Tools":     Grid3X3,
  default:          MessageCircle,
};

function getToolIcon(tool: string): React.ElementType {
  for (const key of Object.keys(toolIconMap)) {
    if (key !== "default" && tool?.toLowerCase().includes(key.toLowerCase()))
      return toolIconMap[key];
  }
  return toolIconMap.default;
}

// ─── Relative-time helper ────────────────────────────────────────────────────
function relativeTime(raw: string | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const diff  = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days  < 2)  return "Yesterday";
  return `${days} days ago`;
}

function formatDateTime(raw: string | undefined, type: "date" | "time") {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  if (type === "date")
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  iconColor,
  loading,
  error,
  empty,
  scrollable = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="edtech-card flex flex-col">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 flex-shrink-0">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        {title}
      </h3>

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && empty && (
        <p className="text-sm text-muted-foreground text-center py-6">No data available yet.</p>
      )}

      {!loading && !error && !empty && (
        <div className={scrollable ? "overflow-y-auto max-h-[320px] pr-1 custom-scrollbar" : ""}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Score colour helper ──────────────────────────────────────────────────────
function scoreColor(pct: number): string {
  if (pct >= 80) return "text-green-600 dark:text-green-400";
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [queries,  setQueries]  = useState<RecentQuery[]>([]);
  const [features, setFeatures] = useState<FeatureExplored[]>([]);
  const [logins,   setLogins]   = useState<LoginRecord[]>([]);
  const [exams,    setExams]    = useState<LatestTest[]>([]);    // ← real data

  const [loadingQ, setLoadingQ] = useState(true);
  const [loadingF, setLoadingF] = useState(true);
  const [loadingL, setLoadingL] = useState(true);
  const [loadingE, setLoadingE] = useState(true);               // ← new

  const [errorQ, setErrorQ] = useState<string | null>(null);
  const [errorF, setErrorF] = useState<string | null>(null);
  const [errorL, setErrorL] = useState<string | null>(null);
  const [errorE, setErrorE] = useState<string | null>(null);    // ← new

  useEffect(() => {
    if (!token) return;

    fetchRecentQueries(token)
      .then(setQueries)
      .catch((e) => setErrorQ(e.message))
      .finally(() => setLoadingQ(false));

    fetchFeaturesExplored(token)
      .then(setFeatures)
      .catch((e) => setErrorF(e.message))
      .finally(() => setLoadingF(false));

    fetchLoginHistory(token)
      .then(setLogins)
      .catch((e) => setErrorL(e.message))
      .finally(() => setLoadingL(false));

    // ← real exam history
    fetchLatestTests(token)
      .then(setExams)
      .catch((e) => setErrorE(e.message))
      .finally(() => setLoadingE(false));

  }, [token]);

  const TOP           = 5;
  const visibleLogins = logins.slice(0, TOP);

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            History
          </h1>
          <p className="text-muted-foreground mt-1">Track your learning journey and activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Recent Queries ── */}
          <Section
            title="Recent Queries"
            icon={MessageCircle}
            iconColor="text-primary"
            loading={loadingQ}
            error={errorQ}
            empty={queries.length === 0}
            scrollable={queries.length > TOP}
          >
            <div className="space-y-2">
              {queries.map((item, index) => {
                const Icon            = getToolIcon(item.tool);
                const hasConversation = item.conversation_id != null;
                const toolSource      = item.tool?.toLowerCase().includes("practice") ? "practice" : "gini";
                const targetPath      = item.url || "/ai-gini";
                return (
                  <button
                    key={index}
                    onClick={() =>
                      hasConversation
                        ? navigate(targetPath, {
                            state: {
                              conversationId: String(item.conversation_id),
                              source: toolSource,
                            },
                          })
                        : navigate(targetPath)
                    }
                    className="w-full flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.query}
                      </p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-xs">{item.tool}</Badge>
                        {item.subject && item.subject !== "all" && (
                          <Badge variant="outline" className="text-xs">{String(item.subject)}</Badge>
                        )}
                        {item.turn_count && Number(item.turn_count) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Number(item.turn_count)} turn{Number(item.turn_count) !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{item.time as string}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Features Explored ── */}
          <Section
            title="Features Explored"
            icon={Grid3X3}
            iconColor="text-secondary"
            loading={loadingF}
            error={errorF}
            empty={features.length === 0}
            scrollable={features.length > TOP}
          >
            <div className="space-y-2">
              {features.map((feature, index) => {
                const Icon = getToolIcon(feature.name);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-secondary/10 flex-shrink-0">
                      <Icon className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last used: {relativeTime(feature.lastUsed)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">{feature.usageCount}</p>
                      <p className="text-xs text-muted-foreground">uses</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Exam History ── */}
          <Section
            title="Exam History"
            icon={BookOpen}
            iconColor="text-chart-4"
            loading={loadingE}
            error={errorE}
            empty={exams.length === 0}
            scrollable={exams.length > TOP}
          >
            <div className="space-y-2">
              {exams.map((exam, index) => {
                const pct = Math.round(exam.score); // score is already a percentage from API
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-chart-4/10 flex-shrink-0">
                      <Award className="w-4 h-4 text-chart-4" />
                    </div>

                    {/* Subject + progress bar */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {exam.subject}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-chart-4 transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Score badge */}
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-bold ${scoreColor(pct)}`}>{pct}%</p>
                      <p className="text-xs text-muted-foreground">score</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Login History ── */}
          <Section
            title="Login History"
            icon={LogIn}
            iconColor="text-chart-3"
            loading={loadingL}
            error={errorL}
            empty={logins.length === 0}
            scrollable={logins.length > TOP}
          >
            <div className="space-y-2">
              {(logins.length > TOP ? logins : visibleLogins).map((login, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="p-2 rounded-lg bg-chart-3/10 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-chart-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {login.date ? formatDateTime(login.date, "date") : "—"}
                      </p>
                      <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                        {login.device || "Unknown"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {login.time
                          ? (login.time.includes(":") ? login.time : formatDateTime(login.date, "time"))
                          : formatDateTime(login.date, "time")}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        📍 {login.location || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>

        {/* ── Fallback: no token ── */}
        {!token && (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Please log in to view your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}