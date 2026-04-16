import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Clock, BarChart3 } from "lucide-react";

export default function TestSubmittedPage() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const endDatetime = location.state?.end_datetime;
  const attemptId   = location.state?.attempt_id;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border/50 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-sm">

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-200
          flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Copy */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Test Submitted!</h1>
          <p className="text-muted-foreground text-sm">
            Your answers have been recorded successfully.
          </p>
        </div>

        {/* Result availability */}
        {endDatetime && (
          <div className="bg-accent/60 border border-border rounded-xl p-4 flex items-start gap-3 text-left">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Your result will be available after{" "}
              <span className="text-foreground font-medium">
                {new Date(endDatetime).toLocaleString()}
              </span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {attemptId && (
            <button
              onClick={() => navigate(`/student/tests/result/${attemptId}`)}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
                text-primary-foreground py-3 rounded-xl font-semibold text-sm transition-all shadow-sm">
              <BarChart3 className="w-4 h-4" />
              View My Result
            </button>
          )}
          <button
            onClick={() => navigate("/student/tests")}
            className="w-full py-3 rounded-xl border border-border bg-background hover:bg-accent
              text-foreground font-medium text-sm transition-all">
            Back to My Tests
          </button>
        </div>
      </div>
    </div>
  );
}
