import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, Clock, ArrowLeft,
  PenLine, BarChart3, Trophy, MinusCircle
} from "lucide-react";
import { studentApi } from "@/api/assessmentApi";
import { Spinner } from "@/components/assessment/SharedComponents";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawOption { key: string; text: string; }

interface AnswerItem {
  question_id:    number;
  question_text:  string;
  question_type:  string;
  answer_text:    string;   // student's choice
  correct_answer: string;
  is_correct:     boolean | null;
  marks_obtained: number;
  options:        RawOption[] | null;
}

// ─── parseOptions (same as TakeTestPage) ────────────────────────────────────

function parseOptions(raw: AnswerItem["options"]): Record<string, string> | null {
  if (!raw) return null;
  try {
    let arr: RawOption[] =
      typeof raw === "string" ? JSON.parse(raw as unknown as string)
      : Array.isArray(raw) ? raw : [];

    // Detect character-array corruption
    if (arr.length > 8 && arr.every((el) => typeof el === "string" && (el as unknown as string).length <= 2)) {
      const joined = (arr as unknown as string[]).join("");
      try {
        const r = JSON.parse(joined);
        if (Array.isArray(r)) arr = r;
      } catch { return null; }
    }

    const map: Record<string, string> = {};
    arr.forEach((item) => { if (item?.key) map[item.key] = item.text; });
    return Object.keys(map).length > 0 ? map : null;
  } catch { return null; }
}

// ─── Normalise raw API response ───────────────────────────────────────────────

function normaliseResult(raw: Record<string, unknown>) {
  const attempt    = (raw?.attempt as Record<string, unknown>) ?? raw;
  const rawAnswers = Array.isArray(raw?.answers) ? (raw.answers as Record<string, unknown>[]) : [];

  const score       = Number(attempt.total_marks_obtained ?? attempt.score        ?? 0);
  const total_marks = Number(attempt.total_marks_possible ?? attempt.total_marks  ?? 0);
  const rawPct      = attempt.percentage ?? (total_marks > 0 ? Math.round((score / total_marks) * 100) : 0);
  const percentage  = isNaN(Number(rawPct)) ? 0 : Number(rawPct);

  let time_taken_seconds = Number(attempt.time_taken_seconds ?? attempt.time_taken ?? 0);
  if (!time_taken_seconds && attempt.submitted_at && attempt.createdAt) {
    time_taken_seconds = Math.round(
      (new Date(attempt.submitted_at as string).getTime() -
       new Date(attempt.createdAt    as string).getTime()) / 1000
    );
  }

  const answers: AnswerItem[] = rawAnswers.map((a) => ({
    question_id:    Number(a.question_id ?? 0),
    question_text:  String(a.question_text  ?? ""),
    question_type:  String(a.question_type  ?? "mcq"),
    answer_text:    String(a.answer_text    ?? a.student_answer ?? ""),
    correct_answer: String(a.correct_answer ?? ""),
    is_correct:     a.is_correct === null ? null : Boolean(a.is_correct),
    marks_obtained: Number(a.marks_obtained ?? 0),
    options:        (a.options as RawOption[] | null) ?? null,
  }));

  return { score, total_marks, percentage, time_taken_seconds, answers };
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({ percentage }: { percentage: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const color = percentage >= 80 ? "#16a34a" : percentage >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ - (percentage / 100) * circ}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-black text-foreground">{Math.round(percentage)}%</div>
      </div>
    </div>
  );
}

function getGrade(p: number) {
  if (p >= 90) return { text: "Excellent! 🎉",     cls: "text-green-600 bg-green-50 border-green-200" };
  if (p >= 80) return { text: "Great job! 👏",      cls: "text-green-600 bg-green-50 border-green-200" };
  if (p >= 60) return { text: "Good work! 👍",      cls: "text-primary  bg-primary/5 border-primary/20" };
  if (p >= 50) return { text: "Keep it up! 💪",     cls: "text-amber-600 bg-amber-50 border-amber-200" };
  return         { text: "Keep practicing! 📚",      cls: "text-destructive bg-destructive/5 border-destructive/20" };
}

const fmtTime = (s: number) => (!s || isNaN(s) || s <= 0) ? "—" : `${Math.floor(s / 60)}m ${s % 60}s`;

// ─── Option chip inside question review ───────────────────────────────────────

function OptionChip({
  optKey, text, isStudentPick, isCorrect,
}: { optKey: string; text: string; isStudentPick: boolean; isCorrect: boolean }) {
  let cls = "border-border bg-background text-foreground/70";
  let badge: React.ReactNode = null;

  if (isStudentPick && isCorrect) {
    cls   = "border-green-400 bg-green-50 text-green-800";
    badge = <span className="ml-1 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Your answer ✓</span>;
  } else if (isStudentPick && !isCorrect) {
    cls   = "border-red-400 bg-red-50 text-red-800";
    badge = <span className="ml-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Your answer ✗</span>;
  } else if (!isStudentPick && isCorrect) {
    cls   = "border-green-300 bg-green-50/60 text-green-700";
    badge = <span className="ml-1 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Correct ✓</span>;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${cls}`}>
      <span className="font-bold flex-shrink-0">{optKey}.</span>
      <span className="flex-1">{text}</span>
      {badge}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestResultPage() {
  const { attempt_id } = useParams<{ attempt_id: string }>();
  const navigate       = useNavigate();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["test-result", attempt_id],
    queryFn:  async () => {
      const res = await studentApi.getAttemptResult(Number(attempt_id));
      return (res.data?.data ?? res.data ?? {}) as Record<string, unknown>;
    },
  });

  const data = rawData ? normaliseResult(rawData) : null;

  return (
    <div className="min-h-full bg-background p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Test Result
        </h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Loading your results…</p>
        </div>
      ) : data ? (
        <div className="max-w-3xl mx-auto space-y-6">

          {/* ── Score Card ── */}
          <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <CircularProgress percentage={data.percentage} />
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="text-4xl font-black text-foreground">
                  {data.score}{" "}
                  <span className="text-muted-foreground font-normal text-2xl">/ {data.total_marks}</span>
                </div>
                {(() => { const g = getGrade(data.percentage); return (
                  <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${g.cls}`}>{g.text}</span>
                ); })()}
                <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground text-sm">
                  <Clock className="w-4 h-4" />
                  Time taken: <span className="text-foreground font-medium">{fmtTime(data.time_taken_seconds)}</span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-3 sm:gap-2">
                <div className="text-center bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="text-xl font-bold text-green-700">{data.answers.filter(a => a.is_correct).length}</div>
                  <div className="text-xs text-green-600">Correct</div>
                </div>
                <div className="text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <div className="text-xl font-bold text-red-600">
                    {data.answers.filter(a => a.is_correct === false && a.question_type !== "essay").length}
                  </div>
                  <div className="text-xs text-red-500">Wrong</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Question Review ── */}
          {data.answers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Question Review
              </h2>

              {data.answers.map((a, i) => {
                const isEssay    = a.question_type === "essay";
                const isCorrect  = a.is_correct === true;
                const isWrong    = a.is_correct === false;
                const isPending  = a.is_correct === null;
                const opts       = parseOptions(a.options);
                const hasOptions = opts && Object.keys(opts).length > 0;

                const cardCls = isPending || isEssay
                  ? "border-purple-200 bg-purple-50/30"
                  : isCorrect ? "border-green-200 bg-green-50/20"
                  : "border-red-200 bg-red-50/20";

                return (
                  <div key={a.question_id} className={`rounded-2xl border-2 p-5 space-y-4 ${cardCls}`}>

                    {/* Question header */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold text-muted-foreground mt-0.5 flex-shrink-0 w-6">
                        Q{i + 1}
                      </span>
                      <p className="text-foreground text-sm font-medium flex-1 leading-relaxed">
                        {a.question_text || <span className="italic text-muted-foreground">Question text unavailable</span>}
                      </p>
                      {isEssay || isPending ? (
                        <div className="flex items-center gap-1 text-purple-600 flex-shrink-0">
                          <PenLine className="w-4 h-4" />
                          <span className="text-xs font-medium">Manual review</span>
                        </div>
                      ) : isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* MCQ / True-False: show all options with highlights */}
                    {(a.question_type === "mcq" || a.question_type === "true_false") && hasOptions && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(opts!).map(([key, text]) => (
                          <OptionChip
                            key={key}
                            optKey={key}
                            text={text}
                            isStudentPick={a.answer_text?.trim().toUpperCase() === key.trim().toUpperCase()}
                            isCorrect={a.correct_answer?.trim().toUpperCase() === key.trim().toUpperCase()}
                          />
                        ))}
                      </div>
                    )}

                    {/* Fallback when no options data: show answer text boxes */}
                    {(a.question_type === "mcq" || a.question_type === "true_false") && !hasOptions && (
                      <div className="space-y-2">
                        <div className={`px-3 py-2 rounded-lg text-sm border ${
                          isCorrect ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-red-50 border-red-200 text-red-800"}`}>
                          <span className="text-xs font-medium text-muted-foreground mr-2">Your answer:</span>
                          {a.answer_text || <span className="italic text-muted-foreground">Not answered</span>}
                        </div>
                        {isWrong && (
                          <div className="px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800">
                            <span className="text-xs font-medium text-muted-foreground mr-2">Correct answer:</span>
                            {a.correct_answer}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Short answer */}
                    {(a.question_type === "short" || a.question_type === "short_answer") && (
                      <div className="space-y-2">
                        <div className={`px-3 py-2 rounded-lg text-sm border ${
                          isCorrect ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-red-50 border-red-200 text-red-800"}`}>
                          <span className="text-xs font-medium text-muted-foreground mr-2">Your answer:</span>
                          {a.answer_text || <span className="italic text-muted-foreground">Not answered</span>}
                        </div>
                        {isWrong && a.correct_answer && (
                          <div className="px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800">
                            <span className="text-xs font-medium text-muted-foreground mr-2">Correct answer:</span>
                            {a.correct_answer}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Essay */}
                    {isEssay && (
                      <div className="px-3 py-2 rounded-lg text-sm bg-purple-50 border border-purple-200 text-purple-800">
                        <p className="text-xs font-medium text-purple-500 mb-1">Your answer:</p>
                        <p className="leading-relaxed">{a.answer_text || <span className="italic">Not answered</span>}</p>
                        <p className="mt-2 text-xs italic text-purple-500">
                          <MinusCircle className="w-3 h-3 inline mr-1" />Pending manual review
                        </p>
                      </div>
                    )}

                    {/* Marks badge */}
                    {!isEssay && !isPending && (
                      <div className="flex justify-end">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {isCorrect ? `+${a.marks_obtained}` : "+0"} marks
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Back */}
          <div className="pt-2 pb-8">
            <button onClick={() => navigate("/student/tests")}
              className="flex items-center gap-2 bg-muted hover:bg-accent border border-border
                text-muted-foreground hover:text-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back to My Tests
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground">Result not found.</div>
      )}
    </div>
  );
}
