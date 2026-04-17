import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Clock, AlertTriangle,
  CheckCircle, ClipboardList, Lightbulb
} from "lucide-react";
import { studentApi } from "@/api/assessmentApi";
import { Spinner, ConfirmDialog } from "@/components/assessment/SharedComponents";
import { useToast } from "@/components/assessment/ToastProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawOption { key: string; text: string; }

interface Question {
  question_id: number;
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer" | "short" | "essay";
  options?: string | RawOption[] | Record<string, string> | null;
  hint?: string | null;
  marks: number;
}

interface AttemptData {
  attempt_id:              number;
  assessment_id:           number;
  questions:               Question[];
  time_limit_seconds:      number | null;
  show_result_immediately: boolean;
  end_datetime:            string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const qId = (q: Question) => q.question_id ?? 0;

/**
 * Parse the `options` field — mirrors ReviewQuestionsPage (teacher view) + handles
 * the triple-encoded "character array" bug from existing DB data.
 *
 * Root cause of bug: Sequelize DataTypes.JSON stored a string instead of array,
 * producing an array of individual characters on read. We re-join + re-parse.
 */
function parseOptions(raw?: Question["options"]): Record<string, string> | null {
  if (!raw) return null;
  try {
    let arr: Array<{ key: string; text: string }> =
      typeof raw === "string"
        ? JSON.parse(raw)
        : Array.isArray(raw)
          ? (raw as Array<{ key: string; text: string }>)
          : [];

    // ── Detect character-array corruption ──────────────────────────────────
    // If every element is a string with ≤2 chars, the DB stored a JSON string
    // as an array of individual characters. Join + re-parse to recover.
    if (
      arr.length > 8 &&
      arr.every((el) => typeof el === "string" && (el as unknown as string).length <= 2)
    ) {
      const joined = (arr as unknown as string[]).join("");
      let recovered: unknown = null;
      try { recovered = JSON.parse(joined); } catch {}
      // It might still be a JSON-encoded string after the first parse
      if (typeof recovered === "string") {
        try { recovered = JSON.parse(recovered); } catch {}
      }
      if (Array.isArray(recovered)) {
        arr = recovered as Array<{ key: string; text: string }>;
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    const map: Record<string, string> = {};
    arr.forEach((item) => { if (item?.key) map[item.key] = item.text; });
    return Object.keys(map).length > 0 ? map : null;
  } catch {
    // Already a plain object { A: text, B: text, ... }
    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return null;
  }
}

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useTimer(totalSeconds: number | null, onExpire: () => void) {
  const [seconds, setSeconds] = useState<number>(totalSeconds ?? 0);
  const cbRef = useRef(onExpire);
  cbRef.current = onExpire;

  useEffect(() => {
    if (!totalSeconds) return;
    setSeconds(totalSeconds);
    const iv = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(iv); cbRef.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [totalSeconds]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    display: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`,
    isWarning: seconds < 300 && seconds > 0,
    isDanger:  seconds < 60  && seconds > 0,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TakeTestPage() {
  const { assignment_id } = useParams<{ assignment_id: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { showToast } = useToast();
  const assignmentIdNum = Number(assignment_id);

  // Time limit passed via router state from the test list
  const routeTimeLimitMinutes: number | null =
    (location.state as { timeLimitMinutes?: number | null })?.timeLimitMinutes ?? null;

  const [attemptData,   setAttemptData]   = useState<AttemptData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [answers,       setAnswers]       = useState<Record<number, string>>({});
  const [showHint,      setShowHint]      = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting,    setSubmitting]    = useState(false);

  useEffect(() => {
    let cancelled = false;

    studentApi.startAttempt(assignmentIdNum)
      .then(async (res) => {
        const raw = res.data?.data ?? res.data;
        console.log("[TakeTest] startAttempt raw:", JSON.stringify(raw, null, 2));

        const attempt   = raw?.attempt ?? raw;
        const attemptId = attempt.attempt_id;

        // ── Fetch questions WITH hints from the dedicated endpoint ──────────────
        // startAttempt now includes hints (backend fixed), but we also support
        // fetching from /attempt/:id/questions as a fallback/refresh mechanism.
        let questions: Question[] = (raw?.questions ?? []).map((q: Question) => ({
          ...q,
          question_type: (!q.question_type || q.question_type === "short"
            ? "short_answer"
            : q.question_type) as Question["question_type"],
        }));

        // If hints are missing from startAttempt response (old backend), fetch separately
        const hasMissingHints = questions.some(q => q.hint === undefined);
        if (hasMissingHints && attemptId) {
          try {
            const qres  = await studentApi.getAttemptQuestions(attemptId);
            const qdata = qres.data?.data ?? qres.data;
            const freshQs: Question[] = qdata?.questions ?? [];
            // Build a hint map from the fresh questions
            const hintMap: Record<number, string> = {};
            freshQs.forEach(q => { if (q.hint) hintMap[q.question_id] = q.hint; });
            questions = questions.map(q => ({
              ...q,
              hint: hintMap[q.question_id] ?? q.hint ?? null,
            }));
          } catch {
            // hints unavailable — non-critical, continue without them
          }
        }

        if (cancelled) return;

        const timeMins =
          routeTimeLimitMinutes ??
          attempt.time_limit_minutes ??
          null;

        setAttemptData({
          attempt_id:              attemptId,
          assessment_id:           0,
          questions,
          time_limit_seconds:      timeMins ? timeMins * 60 : null,
          show_result_immediately: attempt.show_result_immediately ?? false,
          end_datetime:            attempt.end_datetime ?? "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[TakeTest] startAttempt error:", err?.response?.data ?? err);
        showToast(err?.response?.data?.message || "Failed to start test", "error");
        navigate("/student/tests");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [assignmentIdNum]);

  const handleAutoSubmit = useCallback(async () => {
    if (!attemptData) return;
    try {
      await studentApi.submitAttempt({
        attempt_id: attemptData.attempt_id,
        answers: Object.entries(answers).map(([qid, ans]) => ({ question_id: Number(qid), answer_text: ans })),
        is_auto_submit: true,
      });
      showToast("Time's up! Test auto-submitted.", "warning");
      navigate("/student/tests");
    } catch { showToast("Auto-submit failed", "error"); }
  }, [attemptData, answers, navigate, showToast]);

  const { display: timerDisplay, isWarning, isDanger } = useTimer(
    attemptData?.time_limit_seconds ?? null, handleAutoSubmit
  );

  const handleSubmit = async () => {
    if (!attemptData) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitAttempt({
        attempt_id: attemptData.attempt_id,
        answers: Object.entries(answers).map(([q, ans]) => ({ question_id: Number(q), answer_text: ans })),
        is_auto_submit: false,
      });
      const rdata = res.data?.data ?? res.data;
      const aid   = rdata?.attempt_id ?? attemptData.attempt_id;
      const showImmediately = rdata?.show_result_immediately ?? attemptData.show_result_immediately;
      if (showImmediately && aid) {
        navigate(`/student/tests/result/${aid}`);
      } else {
        navigate("/student/tests/submitted", {
          state: { end_datetime: attemptData.end_datetime, attempt_id: aid },
        });
      }
    } catch { showToast("Failed to submit test", "error"); }
    finally { setSubmitting(false); setConfirmSubmit(false); }
  };

  // ── Loading ──
  if (loading) return (
    <div className="min-h-full bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Preparing your test…</p>
      </div>
    </div>
  );

  if (!attemptData) return null;

  const questions     = attemptData.questions ?? [];
  const currentQ      = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const currentQId    = currentQ ? qId(currentQ) : 0;

  return (
    <div className="h-screen bg-background flex overflow-hidden">

      {/* ── Left Sidebar ── */}
      <div className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col p-4 gap-4">

        {/* Timer */}
        <div className={`rounded-xl p-3 text-center border ${
          isDanger  ? "bg-red-50   border-red-200"
          : isWarning ? "bg-amber-50 border-amber-200"
          : "bg-accent border-border/40"}`}>
          <Clock className={`w-5 h-5 mx-auto mb-1 ${
            isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-primary/60"}`} />
          <div className={`text-xl font-mono font-bold ${
            isDanger ? "text-red-600 animate-pulse" : isWarning ? "text-amber-600" : "text-foreground"}`}>
            {attemptData.time_limit_seconds ? timerDisplay : "No Limit"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Time Remaining</div>
        </div>

        {/* Progress */}
        <div className="text-xs text-muted-foreground text-center font-medium">
          <span className="text-primary font-bold">{answeredCount}</span> / {questions.length} answered
        </div>

        {/* Question Navigator */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const qid        = qId(q);
              const isAnswered = !!answers[qid];
              const isCurrent  = i === currentIdx;
              return (
                <button key={qid || i} onClick={() => { setCurrentIdx(i); setShowHint(false); }}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                    isCurrent  ? "ring-2 ring-primary bg-primary text-primary-foreground"
                    : isAnswered ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-100 border border-green-200" /> Answered</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-muted" /> Not Answered</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-primary" /> Current</div>
        </div>

        {/* Submit */}
        <button onClick={() => setConfirmSubmit(true)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3
            rounded-xl text-sm font-semibold transition-all shadow-edtech">
          Submit Test
        </button>
      </div>

      {/* ── Right Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="border-b border-border px-6 py-3 flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Question <span className="text-foreground font-bold">{currentIdx + 1}</span>
              {" of "}
              <span className="text-foreground font-bold">{questions.length}</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground bg-accent px-2.5 py-1 rounded-lg border border-border/50">
            {currentQ?.marks} mark{currentQ?.marks !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Question Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          {currentQ && (() => {
            const opts = parseOptions(currentQ.options);
            const type = currentQ.question_type;

            return (
              <div className="max-w-3xl mx-auto space-y-6">

                {/* Question text */}
                <h2 className="text-xl font-semibold text-foreground leading-relaxed">
                  {currentQ.question_text}
                </h2>

                {/* ── MCQ — 2×2 grid (matches teacher review style) ── */}
                {type === "mcq" && opts && Object.keys(opts).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(opts).map(([key, text]) => {
                      const selected = answers[currentQId] === key;
                      return (
                        <button key={key}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQId]: key }))}
                          className={`text-sm px-4 py-3 rounded-xl border-2 text-left transition-all font-medium ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent/40"
                          }`}>
                          <span className="font-bold">{key}.</span> {text}
                        </button>
                      );
                    })}
                  </div>

                ) : type === "mcq" ? (
                  /* MCQ fallback — options couldn't be loaded; show A/B/C/D tiles */
                  <div className="grid grid-cols-2 gap-3">
                    {["A","B","C","D"].map((letter) => {
                      const selected = answers[currentQId] === letter;
                      return (
                        <button key={letter}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQId]: letter }))}
                          className={`text-2xl font-bold py-6 rounded-xl border-2 transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent/40"
                          }`}>
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                ) : type === "true_false" ? (
                  /* True / False */
                  <div className="flex gap-4">
                    {(opts && Object.keys(opts).length > 0
                      ? Object.entries(opts)
                      : [["T", "True"], ["F", "False"]]
                    ).map(([key, label]) => {
                      const selected = answers[currentQId] === key;
                      const isTrue   = key === "T" || String(label).toLowerCase() === "true";
                      return (
                        <button key={key}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQId]: key }))}
                          className={`flex-1 py-5 rounded-xl border-2 text-lg font-bold transition-all ${
                            selected
                              ? isTrue
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-red-500 bg-red-50 text-red-700"
                              : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent/30"}`}>
                          {String(label)}
                        </button>
                      );
                    })}
                  </div>

                ) : type === "short_answer" || type === "short" ? (
                  /* Short Answer */
                  <textarea
                    value={answers[currentQId] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQId]: e.target.value }))}
                    rows={4}
                    className="w-full bg-background border border-input rounded-xl px-4 py-3
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
                    placeholder="Type your answer here…" />

                ) : type === "essay" ? (
                  /* Essay */
                  <textarea
                    value={answers[currentQId] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQId]: e.target.value }))}
                    rows={10}
                    className="w-full bg-background border border-input rounded-xl px-4 py-3
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
                    placeholder="Write your detailed answer here…" />

                ) : (
                  /* Catch-all */
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs bg-accent rounded-lg px-3 py-2 border border-border">
                      Question type: <strong>{type}</strong>
                    </p>
                    <textarea
                      value={answers[currentQId] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQId]: e.target.value }))}
                      rows={4}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3
                        text-foreground placeholder:text-muted-foreground
                        focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
                      placeholder="Type your answer here…" />
                  </div>
                )}

                {/* ── Hint toggle ── */}
                {currentQ.hint ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowHint((v) => !v)}
                      className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg
                        border transition-all ${
                        showHint
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {showHint ? "Hide Hint" : "Show Hint"}
                    </button>
                    {showHint && (
                      <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200
                        rounded-xl px-4 py-3 text-sm text-amber-800">
                        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <span>{currentQ.hint}</span>
                      </div>
                    )}
                  </div>
                ) : null}

              </div>
            );
          })()}
        </div>

        {/* Navigation bar */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-card/60">
          <button
            onClick={() => { setCurrentIdx((i) => Math.max(0, i - 1)); setShowHint(false); }}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 bg-muted hover:bg-accent disabled:opacity-30
              border border-border rounded-xl px-4 py-2.5 text-sm text-foreground transition">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {currentIdx < questions.length - 1 ? (
            <button onClick={() => { setCurrentIdx((i) => i + 1); setShowHint(false); }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground
                rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-edtech">
              Save &amp; Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setConfirmSubmit(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white
                rounded-xl px-4 py-2.5 text-sm font-semibold transition">
              <CheckCircle className="w-4 h-4" /> Submit Test
            </button>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmSubmit} title="Submit Test"
        message={
          <div className="space-y-2">
            <p className="text-foreground">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
            </p>
            {answeredCount < questions.length && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{questions.length - answeredCount} unanswered question{questions.length - answeredCount !== 1 ? "s" : ""}!</span>
              </div>
            )}
            <p className="text-muted-foreground text-sm">Are you sure you want to submit?</p>
          </div>
        }
        confirmLabel={submitting ? "Submitting…" : "Yes, Submit"}
        confirmClass="bg-green-600 hover:bg-green-700 text-white"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}
