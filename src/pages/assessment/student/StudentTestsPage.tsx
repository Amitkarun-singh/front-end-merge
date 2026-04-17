import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Clock, BookOpen, Calendar, Play, ArrowRight,
  ClipboardList, Trophy, Lock
} from "lucide-react";
import { studentApi } from "@/api/assessmentApi";
import { CardSkeleton } from "@/components/assessment/SharedComponents";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignedTest {
  assignment_id:  number;
  assessment_id:  number;
  title:          string;
  subject_name?:  string;
  total_marks:    number;
  // backend sends time_limit_minutes
  time_limit_minutes?: number | null;
  time_limit?:         number | null;
  start_datetime: string;
  end_datetime:   string;
  // backend sends attempt_status + attempted bool
  status?:          "not_started" | "in_progress" | "submitted";
  attempt_status?:  string | null;
  attempted?:       boolean;
  show_result_immediately?: boolean;
  attempt_id?:    number;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(endDatetime: string) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endDatetime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endDatetime]);
  return timeLeft;
}

// ─── Derive display status (includes "closed" for expired+not-submitted) ──────

type DisplayStatus = "not_started" | "in_progress" | "submitted" | "closed";

function deriveStatus(test: AssignedTest): DisplayStatus {
  const isExpired = new Date(test.end_datetime).getTime() < Date.now();

  // submitted always takes priority
  if ((test.status as string) === "submitted" || test.attempt_status === "submitted") return "submitted";

  // Expired + not submitted → closed
  if (isExpired) return "closed";

  // Active in-progress
  if ((test.status as string) === "in_progress" || test.attempt_status === "in_progress" || test.attempted === true) return "in_progress";

  return "not_started";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusMap: Record<DisplayStatus, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress:  { label: "In Progress",  cls: "bg-amber-100 text-amber-700 border-amber-200"  },
  submitted:    { label: "Submitted",    cls: "bg-green-100 text-green-700 border-green-200"  },
  closed:       { label: "Closed",       cls: "bg-red-100   text-red-700   border-red-200"    },
};

// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({ test }: { test: AssignedTest }) {
  const countdown = useCountdown(test.end_datetime);
  const isExpired = new Date(test.end_datetime).getTime() < Date.now();
  const status    = deriveStatus(test);

  // Normalise time limit field name
  const timeLimit = test.time_limit_minutes ?? test.time_limit ?? null;

  const { label, cls } = statusMap[status];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-4
      hover:shadow-edtech hover:-translate-y-0.5 transition-all duration-200">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2 flex-1">
          {test.title}
        </h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
          border flex-shrink-0 ${cls}`}>
          {label}
        </span>
      </div>

      <p className="text-muted-foreground text-sm -mt-2">{test.subject_name}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 bg-accent/60 rounded-lg px-3 py-2">
          <BookOpen className="w-3.5 h-3.5 text-primary/60" />
          <span>{test.total_marks} marks</span>
        </div>
        <div className="flex items-center gap-1.5 bg-accent/60 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-primary/60" />
          <span>{timeLimit ? `${timeLimit} min` : "No limit"}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-accent/60 rounded-lg px-3 py-2 col-span-2">
          <Calendar className="w-3.5 h-3.5 text-primary/60" />
          <span>{new Date(test.start_datetime).toLocaleDateString()} — {new Date(test.end_datetime).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Countdown (only while active and not submitted) */}
      {!isExpired && status !== "submitted" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ends in:</span>
          <span className={`font-mono font-semibold ${
            countdown === "Expired" ? "text-destructive"
              : countdown.startsWith("0h") ? "text-amber-600"
              : "text-green-600"}`}>
            {countdown}
          </span>
        </div>
      )}

      {/* CTA Buttons */}
      {status === "not_started" && !isExpired && (
        <Link
          to={`/student/tests/${test.assignment_id}/attempt`}
          state={{ timeLimitMinutes: timeLimit }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
            rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all shadow-edtech">
          <Play className="w-4 h-4" /> Start Test
        </Link>
      )}
      {status === "in_progress" && !isExpired && (
        <Link
          to={`/student/tests/${test.assignment_id}/attempt`}
          state={{ timeLimitMinutes: timeLimit }}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600
            rounded-xl py-2.5 text-sm font-semibold text-white transition-all">
          <ArrowRight className="w-4 h-4" /> Continue Test
        </Link>
      )}
      {status === "submitted" && test.attempt_id && (
        <Link to={`/student/tests/result/${test.attempt_id}`}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700
            rounded-xl py-2.5 text-sm font-semibold text-white transition-all">
          <Trophy className="w-4 h-4" /> View Result
        </Link>
      )}
      {status === "closed" && (
        <div className="flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl
          bg-red-50 border border-red-200 text-red-600 font-medium">
          <Lock className="w-4 h-4" /> Test Closed
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentTestsPage() {
  const { data, isLoading } = useQuery<AssignedTest[]>({
    queryKey: ["student-tests"],
    queryFn: async () => {
      const res = await studentApi.getAssignedTests();
      const list = res.data?.data ?? res.data;
      console.log("[StudentTests] raw API list:", list);
      return Array.isArray(list) ? list : [];
    },
  });

  return (
    <div className="min-h-full bg-background p-6 lg:p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          My Tests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your assigned assessments — attempt them before the deadline
        </p>
      </div>

      {/* Status summary */}
      {!isLoading && data && data.length > 0 && (() => {
        const counts = data.reduce((acc, t) => {
          acc[deriveStatus(t)] = (acc[deriveStatus(t)] || 0) + 1;
          return acc;
        }, {} as Record<DisplayStatus, number>);

        const pills: { label: string; count: number; cls: string }[] = [
          { label: "Total",       count: data.length,                cls: "bg-accent text-foreground" },
          { label: "Not Started", count: counts.not_started ?? 0,   cls: "bg-slate-100 text-slate-700" },
          { label: "In Progress", count: counts.in_progress ?? 0,   cls: "bg-amber-100 text-amber-700" },
          { label: "Submitted",   count: counts.submitted ?? 0,     cls: "bg-green-100 text-green-700" },
          { label: "Closed",      count: counts.closed ?? 0,        cls: "bg-red-100 text-red-700" },
        ].filter((p) => p.count > 0 || p.label === "Total");

        return (
          <div className="flex flex-wrap gap-3 mb-6">
            {pills.map((s) => (
              <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${s.cls} border border-border/30`}>
                <span className="font-bold">{s.count}</span> {s.label}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground">No tests assigned yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Your teacher hasn't assigned any tests yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((test) => <TestCard key={test.assignment_id} test={test} />)}
        </div>
      )}
    </div>
  );
}


