import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Search, Trophy, Users, TrendingUp, TrendingDown } from "lucide-react";
import { teacherApi } from "@/api/assessmentApi";
import { Skeleton } from "@/components/assessment/SharedComponents";

interface Attempt {
  student_name: string;
  roll_number: string;
  score: number;
  total_marks: number;
  percentage: number;
  submitted_at: string;
  status: string;
}

interface AssignmentResult {
  total_attempted: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  total_marks: number;
  attempts: Attempt[];
}

export default function AssignmentResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assignmentId = Number(id);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<AssignmentResult>({
    queryKey: ["assignment-results", assignmentId],
    queryFn: async () => {
      const res = await teacherApi.getAssignmentResults(assignmentId);
      return res.data?.data ?? res.data;
    },
  });

  const filtered = (data?.attempts ?? []).filter((a) =>
    a.student_name.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    if (!data) return;
    const headers = ["Student Name","Roll Number","Score","Out of","Percentage","Submitted At","Status"];
    const rows = data.attempts.map((a) => [
      a.student_name, a.roll_number, a.score, a.total_marks,
      `${a.percentage.toFixed(1)}%`, new Date(a.submitted_at).toLocaleString(), a.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `results-${assignmentId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { icon: <Users className="w-5 h-5" />, label: "Total Attempted", value: data?.total_attempted ?? 0, color: "text-blue-600 bg-blue-50" },
    { icon: <TrendingUp className="w-5 h-5" />, label: "Average Score", value: data ? `${data.average_score.toFixed(1)} / ${data.total_marks}` : "—", color: "text-indigo-600 bg-indigo-50" },
    { icon: <Trophy className="w-5 h-5" />, label: "Highest Score", value: data ? `${data.highest_score} / ${data.total_marks}` : "—", color: "text-green-600 bg-green-50" },
    { icon: <TrendingDown className="w-5 h-5" />, label: "Lowest Score", value: data ? `${data.lowest_score} / ${data.total_marks}` : "—", color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="min-h-full bg-background p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/teacher/assessments")}
          className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assignment Results</h1>
          <p className="text-muted-foreground text-sm">Student performance overview</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>{card.icon}</div>
            {isLoading ? <Skeleton className="h-7 w-20" /> : (
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
          <input type="text" placeholder="Search students..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm
              placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={downloadCSV} disabled={!data}
          className="flex items-center gap-2 bg-muted hover:bg-accent border border-border
            rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Student Name","Roll No.","Score","Out of","Percentage","Submitted At","Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 text-muted-foreground font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              )) : filtered.map((a, i) => (
                <tr key={i} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">{a.student_name}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{a.roll_number}</td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">{a.score}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{a.total_marks}</td>
                  <td className="px-4 py-3.5">
                    <span className={`font-semibold ${a.percentage >= 75 ? "text-green-600" : a.percentage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {a.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{new Date(a.submitted_at).toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      a.status === "submitted" ? "bg-green-100 text-green-700 border border-green-200" : "bg-muted text-muted-foreground border border-border"}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
