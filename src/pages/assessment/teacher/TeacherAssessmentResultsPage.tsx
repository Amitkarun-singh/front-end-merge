import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Download, Search, Trophy,
  Users, TrendingUp, TrendingDown, BarChart3, Eye,
} from "lucide-react";
import { teacherApi } from "@/api/assessmentApi";
import { Spinner } from "@/components/assessment/SharedComponents";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttemptRow {
  attempt_id?:   number;
  student_name:  string;
  roll_number:   string;
  class_name?:   string;
  section_name?: string;
  score:         number;
  total_marks:   number;
  percentage:    number;
  submitted_at:  string;
  status:        string;
}

interface ResultData {
  assessment_title: string;
  total_marks:      number;
  total_students:   number;
  avg_score:        number;
  max_score:        number;
  min_score:        number;
  attempts:         AttemptRow[];
}

// ─── Grade colour helper ───────────────────────────────────────────────────────
const pctCls = (p: number) =>
  p >= 75 ? "text-green-600 font-semibold"
  : p >= 50 ? "text-amber-600 font-semibold"
  : "text-red-600 font-semibold";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherAssessmentResultsPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assessmentId = Number(id);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<ResultData>({
    queryKey: ["assessment-results", assessmentId],
    queryFn:  async () => {
      const res = await teacherApi.getAssessmentResults(assessmentId);
      return res.data?.data ?? res.data;
    },
  });

  const filtered = (data?.attempts ?? []).filter((a) =>
    a.student_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.roll_number ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    if (!data) return;
    const headers = ["Student Name","Roll No.","Class","Section","Score","Out of","Percentage","Submitted At","Status"];
    const rows = data.attempts.map((a) => [
      a.student_name, a.roll_number, a.class_name ?? "—", a.section_name ?? "—",
      a.score, a.total_marks, `${a.percentage}%`,
      new Date(a.submitted_at).toLocaleString(), a.status,
    ]);
    const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a");
    el.href = url; el.download = `results-assessment-${assessmentId}.csv`; el.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { icon: <Users className="w-5 h-5" />,       label: "Total Attempted", value: data?.total_students ?? 0,        color: "text-blue-600  bg-blue-50  border-blue-200"  },
    { icon: <TrendingUp className="w-5 h-5" />,   label: "Average Score",   value: data ? `${data.avg_score} / ${data.total_marks}` : "—", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { icon: <Trophy className="w-5 h-5" />,        label: "Highest Score",   value: data ? `${data.max_score} / ${data.total_marks}` : "—", color: "text-green-600  bg-green-50  border-green-200"  },
    { icon: <TrendingDown className="w-5 h-5" />, label: "Lowest Score",    value: data ? `${data.min_score} / ${data.total_marks}` : "—", color: "text-red-600    bg-red-50    border-red-200"    },
  ];

  return (
    <div className="min-h-full bg-background p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/teacher/assessments")}
          className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            {isLoading ? "Loading…" : (data?.assessment_title ?? "Assessment Results")}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Student performance overview</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((card) => (
          <div key={card.label}
            className={`bg-card border rounded-2xl p-5 flex flex-col gap-3 shadow-sm ${card.color.split(" ").slice(1).join(" ")} border`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color.split(" ")[0]} ${card.color.split(" ")[1]}`}>
              {card.icon}
            </div>
            {isLoading ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search students by name or roll no…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={downloadCSV} disabled={!data || data.attempts.length === 0}
          className="flex items-center gap-2 bg-muted hover:bg-accent border border-border
            rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground
            transition-all disabled:opacity-50">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Spinner size="lg" />
            <p className="text-muted-foreground text-sm">Loading results…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Student Name","Roll No.","Class / Section","Score","Percentage","Submitted At","Action"].map((h) => (
                    <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide
                      ${h === "Student Name" ? "text-left pl-5" : h === "Action" ? "text-right pr-5" : "text-center"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {data?.total_students === 0
                        ? "No students have submitted this assessment yet."
                        : "No students match your search."}
                    </td>
                  </tr>
                ) : filtered.map((a, i) => (
                  <tr key={a.attempt_id ?? i} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">{a.student_name}</td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground">{a.roll_number}</td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground">
                      {[a.class_name, a.section_name].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-foreground">
                      {a.score} <span className="text-muted-foreground font-normal">/ {a.total_marks}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={pctCls(a.percentage)}>{a.percentage}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground text-xs">
                      {new Date(a.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {a.attempt_id && (
                        <button
                          onClick={() => navigate(`/student/tests/result/${a.attempt_id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            bg-accent text-accent-foreground hover:bg-primary/10 hover:text-primary
                            border border-border/50 text-xs font-medium transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
