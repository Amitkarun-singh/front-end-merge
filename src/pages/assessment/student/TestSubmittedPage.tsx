import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Clock, BarChart3, ArrowLeft, Loader2 } from "lucide-react";

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(endIso: string | null) {
  const [msLeft, setMsLeft] = useState<number>(() =>
    endIso ? Math.max(0, new Date(endIso).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!endIso) return;
    const iv = setInterval(() => {
      const diff = new Date(endIso).getTime() - Date.now();
      setMsLeft(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(iv);
  }, [endIso]);

  if (!endIso) return null;

  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return {
    expired: msLeft === 0,
    display: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    endDate: new Date(endIso).toLocaleString(),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TestSubmittedPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const endDatetime          = location.state?.end_datetime   as string | null ?? null;
  const attemptId            = location.state?.attempt_id     as number | null ?? null;
  const showResultImmediately = location.state?.show_result_immediately as boolean ?? false;

  const countdown = useCountdown(endDatetime);

  // If show_result_immediately was true, the teacher allows it even before end time.
  // If the test window has expired, results are always available.
  const resultAvailable =
    showResultImmediately || !endDatetime || (countdown?.expired ?? true);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border/50 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-sm">

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-200
          flex items-center justify-center mx-auto animate-in zoom-in-50 duration-500">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Test Submitted!</h1>
          <p className="text-muted-foreground text-sm">
            Your answers have been recorded successfully.
          </p>
        </div>

        {/* Result availability status */}
        {resultAvailable ? (
          /* ── Result is available right now ── */
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 text-left">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              Your result is ready.{" "}
              <span className="font-medium">Click the button below to view it.</span>
            </p>
          </div>
        ) : (
          /* ── Result locked until test window ends ── */
          <div className="bg-accent/60 border border-border rounded-xl p-4 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Results are available after the test window closes for all students
              </p>
            </div>

            {countdown && !countdown.expired && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Time until results
                </p>
                <div className="font-mono text-3xl font-bold text-foreground tracking-widest">
                  {countdown.display}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Closes: {countdown.endDate}
                </p>
              </div>
            )}

            {/* Waiting spinner while countdown is running */}
            {countdown && !countdown.expired && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Result will unlock automatically when the window closes
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {/* View Result — only shown when allowed */}
          {attemptId && resultAvailable && (
            <button
              onClick={() => navigate(`/student/tests/result/${attemptId}`)}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
                text-primary-foreground py-3 rounded-xl font-semibold text-sm transition-all shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              View My Result
            </button>
          )}

          {/* If result locked but we have attemptId, show a disabled button */}
          {attemptId && !resultAvailable && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-muted
                text-muted-foreground py-3 rounded-xl font-semibold text-sm cursor-not-allowed opacity-60"
            >
              <Clock className="w-4 h-4" />
              Result Locked Until End Time
            </button>
          )}

          <button
            onClick={() => navigate("/student/tests")}
            className="w-full py-3 rounded-xl border border-border bg-background hover:bg-accent
              text-foreground font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Tests
          </button>
        </div>
      </div>
    </div>
  );
}
