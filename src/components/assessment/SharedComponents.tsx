import { ReactNode } from "react";

// ─── Generic Badge ─────────────────────────────────────────────────────────────

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

// ─── Difficulty Badge ──────────────────────────────────────────────────────────

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    easy:   "bg-green-500/20 text-green-400 border border-green-500/30",
    medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    hard:   "bg-red-500/20   text-red-400   border border-red-500/30",
  };
  return <Badge className={styles[difficulty] ?? styles.medium}>{difficulty}</Badge>;
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:       "bg-slate-500/20  text-slate-400  border border-slate-500/30",
    published:   "bg-blue-500/20   text-blue-400   border border-blue-500/30",
    archived:    "bg-slate-600/20  text-slate-500  border border-slate-600/30",
    pending:     "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    approved:    "bg-green-500/20  text-green-400  border border-green-500/30",
    not_started: "bg-blue-500/20   text-blue-400   border border-blue-500/30",
    in_progress: "bg-amber-500/20  text-amber-400  border border-amber-500/30",
    submitted:   "bg-green-500/20  text-green-400  border border-green-500/30",
  };
  const labels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    submitted:   "Submitted",
  };
  return (
    <Badge className={styles[status] ?? styles.draft}>
      {labels[status] ?? status}
    </Badge>
  );
}

// ─── Question Type Badge ───────────────────────────────────────────────────────

export function QuestionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    mcq:          "bg-blue-500/20   text-blue-400   border border-blue-500/30",
    true_false:   "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    short_answer: "bg-teal-500/20   text-teal-400   border border-teal-500/30",
    essay:        "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  };
  const labels: Record<string, string> = {
    mcq:          "MCQ",
    true_false:   "True/False",
    short_answer: "Short Answer",
    essay:        "Essay",
  };
  return (
    <Badge className={styles[type] ?? "bg-gray-500/20 text-gray-400"}>
      {labels[type] ?? type}
    </Badge>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}

// ─── Card Skeleton ─────────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white/70">{title}</h3>
        {description && <p className="text-sm text-white/40 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return (
    <div className={`${sizes[size]} border-2 border-white/20 border-t-white rounded-full animate-spin`} />
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirm",
  confirmClass = "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <div className="text-muted-foreground text-sm mb-6 leading-relaxed">{message}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-muted hover:bg-accent border border-border
              text-foreground text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
