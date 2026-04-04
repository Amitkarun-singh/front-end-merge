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
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  fetchRecentQueries,
  fetchFeaturesExplored,
  fetchLoginHistory,
  RecentQuery,
  FeatureExplored,
  LoginRecord,
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
        <div
          className={
            scrollable
              ? "overflow-y-auto max-h-[320px] pr-1 custom-scrollbar"
              : ""
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Exam result badge color ─────────────────────────────────────────────────
function scoreColor(score: number, total: number): string {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 80) return "text-green-600 dark:text-green-400";
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500";
}

// ─── Mock exam record type (replace with real API type when available) ────────
interface ExamRecord {
  title: string;
  subject: string;
  score: number;
  total: number;
  duration: string;
  date: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [queries,  setQueries]  = useState<RecentQuery[]>([]);
  const [features, setFeatures] = useState<FeatureExplored[]>([]);
  const [logins,   setLogins]   = useState<LoginRecord[]>([]);

  // Placeholder exam records — swap with real API call when endpoint is ready
  const [exams] = useState<ExamRecord[]>([
    { title: "Chapter 5 Quiz",       subject: "Mathematics", score: 18, total: 20, duration: "15 min", date: new Date(Date.now() - 86400000 * 2).toISOString() },
    { title: "Science Unit Test",    subject: "Physics",     score: 34, total: 50, duration: "30 min", date: new Date(Date.now() - 86400000 * 5).toISOString() },
    { title: "English Grammar Test", subject: "English",     score: 12, total: 25, duration: "20 min", date: new Date(Date.now() - 86400000 * 8).toISOString() },
    { title: "History MCQ",          subject: "History",     score: 28, total: 30, duration: "25 min", date: new Date(Date.now() - 86400000 * 12).toISOString() },
    { title: "Chemistry Practical",  subject: "Chemistry",   score: 40, total: 50, duration: "45 min", date: new Date(Date.now() - 86400000 * 15).toISOString() },
  ]);

  const [loadingQ, setLoadingQ] = useState(true);
  const [loadingF, setLoadingF] = useState(true);
  const [loadingL, setLoadingL] = useState(true);

  const [errorQ, setErrorQ] = useState<string | null>(null);
  const [errorF, setErrorF] = useState<string | null>(null);
  const [errorL, setErrorL] = useState<string | null>(null);

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
  }, [token]);

  const TOP = 5;
  const visibleLogins   = logins.slice(0, TOP);

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
                const Icon = getToolIcon(item.tool);
                const hasConversation = item.conversation_id !== undefined && item.conversation_id !== null;
                const toolSource = item.tool?.toLowerCase().includes("practice") ? "practice" : "gini";
                // Navigate to the actual AI feature page with ?conversation_id so it pre-loads there
                const destination = hasConversation
                  ? `${item.url || "/ai-gini"}?conversation_id=${item.conversation_id}&source=${toolSource}`
                  : (item.url || "/ai-gini");
                return (
                  <button
                    key={index}
                    onClick={() => navigate(destination)}
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
                        {/* subject badge if available */}
                        {item.subject && item.subject !== "all" && (
                          <Badge variant="outline" className="text-xs">{String(item.subject)}</Badge>
                        )}
                        {/* turn count */}
                        {item.turn_count && Number(item.turn_count) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Number(item.turn_count)} turn{Number(item.turn_count) !== 1 ? "s" : ""}
                          </span>
                        )}
                        {/* time — already human-readable from API */}
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
            loading={false}
            error={null}
            empty={exams.length === 0}
            scrollable={exams.length > TOP}
          >
            <div className="space-y-2">
              {exams.map((exam, index) => {
                const pct = exam.total > 0 ? Math.round((exam.score / exam.total) * 100) : 0;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-chart-4/10 flex-shrink-0">
                      <Award className="w-4 h-4 text-chart-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{exam.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{exam.subject}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {exam.duration}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(exam.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${scoreColor(exam.score, exam.total)}`}>
                        {exam.score}/{exam.total}
                      </p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
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
