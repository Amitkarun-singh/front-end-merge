import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, CheckSquare, Send, ChevronDown, ChevronUp,
  Edit3, RefreshCw, Trash2, Check, Plus, AlertTriangle,
  ClipboardCheck
} from "lucide-react";
import { teacherApi } from "@/api/assessmentApi";
import {
  QuestionTypeBadge, Spinner, ConfirmDialog, CardSkeleton
} from "@/components/assessment/SharedComponents";
import { useToast } from "@/components/assessment/ToastProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  question_id: number;   // actual field from API
  id?: number;           // fallback alias
  assessment_id: number;
  question_text: string;
  question_type: "mcq" | "true_false" | "short_answer" | "essay";
  options?: string | { A: string; B: string; C: string; D: string } | Array<{ key: string; text: string }>;
  correct_answer?: string;
  hint?: string;
  marks: number;
  status: "pending" | "approved";
}

// ─── Parse options ─────────────────────────────────────────────────────────────
// API returns options as a JSON string: "[{\"key\":\"A\",\"text\":\"...\"}]"
// Normalize to { A: text, B: text, ... } for rendering
function parseOptions(raw?: Question["options"]): Record<string, string> | null {
  if (!raw) return null;
  try {
    const arr: Array<{ key: string; text: string }> =
      typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
    const map: Record<string, string> = {};
    arr.forEach((item) => { map[item.key] = item.text; });
    return Object.keys(map).length > 0 ? map : null;
  } catch {
    // Already a plain object { A, B, C, D }
    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return null;
  }
}

interface EditFormData {
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_answer: string;
  hint: string;
  marks: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const assessmentId = Number(id);

  const [expandedIds,    setExpandedIds]    = useState<Set<number>>(new Set());
  const [editingId,      setEditingId]      = useState<number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [deleteDialog,   setDeleteDialog]   = useState<number | null>(null);
  const [approveAllDialog, setApproveAllDialog] = useState(false);
  const [addDrawerOpen,  setAddDrawerOpen]  = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const { data: questionsData, isLoading } = useQuery({
    queryKey: ["assessment-questions", assessmentId],
    enabled: !isNaN(assessmentId) && assessmentId > 0,
    queryFn: async () => {
      const res = await teacherApi.getAssessmentQuestions(assessmentId);
      return (res.data?.data ?? res.data ?? {}) as {
        assessment?: { title: string; status: string; subject_name?: string; class_name?: string };
        questions?: Question[];
      };
    },
  });

  const questions: Question[] = questionsData?.questions ?? [];
  const assessment = questionsData?.assessment;
  const pendingCount = questions.filter((q) => q.status === "pending").length;

  const qid = (q: Question) => q.question_id ?? q.id ?? 0;

  const toggleExpand = (qid: number) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(qid) ? n.delete(qid) : n.add(qid); return n; });

  const handleApprove = async (q: Question) => {
    try {
      await teacherApi.patchQuestion(qid(q), { action: "approve" });
      qc.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      showToast("Question approved!", "success");
    } catch { showToast("Failed to approve", "error"); }
  };

  const handleRegenerate = async (q: Question) => {
    setRegeneratingId(qid(q));
    try {
      await teacherApi.patchQuestion(qid(q), { action: "regenerate" });
      qc.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      showToast("Question regenerated!", "success");
    } catch { showToast("Regeneration failed", "error"); }
    finally { setRegeneratingId(null); }
  };

  const handleDelete = async (questionId: number) => {
    try {
      await teacherApi.patchQuestion(questionId, { action: "delete" });
      qc.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      showToast("Question deleted", "success");
    } catch { showToast("Failed to delete", "error"); }
    finally { setDeleteDialog(null); }
  };

  const handleApproveAll = async () => {
    try {
      await teacherApi.approveAllQuestions(assessmentId);
      qc.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      showToast("All questions approved!", "success");
    } catch { showToast("Failed to approve all", "error"); }
    finally { setApproveAllDialog(false); }
  };

  const handlePublish = async () => {
    setPublishLoading(true);
    try {
      await teacherApi.publishAssessment(assessmentId);
      showToast("Assessment published successfully!", "success");
      navigate("/teacher/assessments");
    } catch { showToast("Failed to publish", "error"); }
    finally { setPublishLoading(false); }
  };

  const handleEditSave = async (questionId: number, data: EditFormData) => {
    try {
      await teacherApi.patchQuestion(questionId, { action: "edit", ...data });
      qc.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      showToast("Question updated!", "success");
      setEditingId(null);
    } catch { showToast("Failed to update", "error"); }
  };

  return (
    <div className="min-h-full bg-background p-6 lg:p-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/teacher/assessments")}
            className="p-2 mt-0.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                {assessment?.title ?? "Review Questions"}
              </h1>
            </div>
            {assessment && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {assessment.subject_name} · {assessment.class_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Approve All */}
          <button
            onClick={() => setApproveAllDialog(true)}
            disabled={pendingCount === 0}
            className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200
              hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed
              px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            Approve All
            {pendingCount > 0 && (
              <span className="bg-amber-200 text-amber-800 text-xs px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Add Question */}
          <button
            onClick={() => setAddDrawerOpen(true)}
            className="flex items-center gap-2 bg-accent text-accent-foreground border border-border
              hover:bg-primary/10 hover:text-primary px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>

          {/* Publish */}
          <button
            onClick={handlePublish}
            disabled={pendingCount > 0 || publishLoading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground
              disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm font-semibold
              transition-all shadow-edtech"
          >
            {publishLoading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      {/* ── Pending Warning Banner ── */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-amber-700 text-sm">
            <strong>{pendingCount}</strong> question{pendingCount > 1 ? "s" : ""} still pending review.
            Approve all before publishing.
          </p>
        </div>
      )}

      {/* ── Summary strip ── */}
      {!isLoading && questions.length > 0 && (
        <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{questions.length}</strong> total</span>
          <span><strong className="text-green-600">{questions.filter(q => q.status === "approved").length}</strong> approved</span>
          <span><strong className="text-amber-600">{pendingCount}</strong> pending</span>
        </div>
      )}

      {/* ── Questions List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <ClipboardCheck className="w-7 h-7 text-primary/40" />
          </div>
          <h3 className="font-semibold text-foreground">No questions yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Click "Add Question" to add questions manually</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.question_id ?? q.id ?? idx} question={q} index={idx}
              expanded={expandedIds.has(qid(q))}
              editing={editingId === qid(q)}
              regenerating={regeneratingId === qid(q)}
              onToggle={() => toggleExpand(qid(q))}
              onApprove={() => handleApprove(q)}
              onEdit={() => setEditingId(editingId === qid(q) ? null : qid(q))}
              onRegenerate={() => handleRegenerate(q)}
              onDelete={() => setDeleteDialog(qid(q))}
              onEditSave={(data) => handleEditSave(qid(q), data)}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <ConfirmDialog
        open={deleteDialog !== null} title="Delete Question"
        message="Are you sure you want to delete this question? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteDialog !== null && handleDelete(deleteDialog)}
        onCancel={() => setDeleteDialog(null)}
      />
      <ConfirmDialog
        open={approveAllDialog} title="Approve All Questions"
        message={`Approve all ${pendingCount} pending question${pendingCount !== 1 ? "s" : ""}?`}
        confirmLabel="Approve All" confirmClass="bg-amber-500 hover:bg-amber-600 text-white"
        onConfirm={handleApproveAll} onCancel={() => setApproveAllDialog(false)}
      />

      {addDrawerOpen && (
        <AddQuestionDrawer
          assessmentId={assessmentId}
          onClose={() => setAddDrawerOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
            setAddDrawerOpen(false);
            showToast("Question added!", "success");
          }}
        />
      )}
    </div>
  );
}

// ─── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({ question: q, index, expanded, editing, regenerating,
  onToggle, onApprove, onEdit, onRegenerate, onDelete, onEditSave }: {
  question: Question; index: number; expanded: boolean; editing: boolean;
  regenerating: boolean; onToggle: () => void; onApprove: () => void;
  onEdit: () => void; onRegenerate: () => void; onDelete: () => void;
  onEditSave: (d: EditFormData) => Promise<void>;
}) {
  const { register, handleSubmit, reset } = useForm<EditFormData>({
    defaultValues: {
      question_text: q.question_text, option_a: q.options?.A ?? "",
      option_b: q.options?.B ?? "", option_c: q.options?.C ?? "",
      option_d: q.options?.D ?? "", correct_answer: q.correct_answer ?? "",
      hint: q.hint ?? "", marks: q.marks,
    },
  });
  const [saving, setSaving] = useState(false);
  const submitEdit = async (data: EditFormData) => { setSaving(true); await onEditSave(data); setSaving(false); };

  const isPending = q.status === "pending";
  const parsedOptions = parseOptions(q.options);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all bg-card ${
      isPending ? "border-amber-200" : "border-border/50"
    }`}>
      {/* Card Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-accent/40 transition-colors"
        onClick={onToggle}
      >
        {/* Index */}
        <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 ${
          isPending ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
        }`}>
          {index + 1}
        </div>

        {/* Question preview */}
        <p className="text-foreground text-sm flex-1 line-clamp-1">
          {q.question_text.slice(0, 90)}{q.question_text.length > 90 ? "…" : ""}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <QuestionTypeBadge type={q.question_type} />
          <span className="text-muted-foreground text-xs">{q.marks}m</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPending ? "bg-amber-100 text-amber-700 border border-amber-200"
              : "bg-green-100 text-green-700 border border-green-200"
          }`}>
            {isPending ? "Pending" : "Approved"}
          </span>
          {regenerating
            ? <Spinner size="sm" />
            : expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4">
          {!editing ? (
            <div className="space-y-3">
              <p className="text-foreground text-sm leading-relaxed">{q.question_text}</p>

              {q.question_type === "mcq" && parsedOptions && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(parsedOptions).map(([key, val]) => (
                    <div key={key} className={`text-sm px-3 py-2 rounded-lg border ${
                      q.correct_answer === key
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-border bg-muted/30 text-foreground/70"
                    }`}>
                      <span className="font-bold">{key}.</span> {val}
                    </div>
                  ))}
                </div>
              )}

              {q.question_type === "true_false" && (() => {
                // true_false options: [{key:"T",text:"True"},{key:"F",text:"False"}]
                const opts = parsedOptions;
                const correctKey = q.correct_answer; // "T" or "F" or "True"/"False"
                const label = opts?.[correctKey ?? ""] ?? correctKey;
                return (
                  <p className="text-sm text-muted-foreground">
                    Correct: <span className="text-green-600 font-semibold">{label}</span>
                  </p>
                );
              })()}

              {q.hint && (
                <p className="text-sm text-muted-foreground italic bg-accent/50 rounded-lg px-3 py-2">
                  💡 {q.hint}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={onApprove} disabled={q.status === "approved"}
                  className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700
                    border border-green-200 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-40">
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={onEdit}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700
                    border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-medium transition">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={onRegenerate} disabled={regenerating}
                  className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700
                    border border-purple-200 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60">
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} /> Regenerate
                </button>
                <button onClick={onDelete}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700
                    border border-red-200 rounded-lg px-3 py-1.5 text-xs font-medium transition">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ) : (
            // Edit form
            <form onSubmit={handleSubmit(submitEdit)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Question Text</label>
                <textarea {...register("question_text", { required: true })} rows={3}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground text-sm
                    focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              {q.question_type === "mcq" && (
                <div className="grid grid-cols-2 gap-3">
                  {["A", "B", "C", "D"].map((l) => (
                    <div key={l}>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Option {l}</label>
                      <input {...register(`option_${l.toLowerCase()}` as keyof EditFormData)}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm
                          focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct Answer</label>
                    <select {...register("correct_answer")}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {["A","B","C","D"].map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {q.question_type === "true_false" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct Answer</label>
                  <div className="flex gap-4">
                    {["True","False"].map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input type="radio" value={v} {...register("correct_answer")} className="accent-primary" />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Hint</label>
                  <input {...register("hint")}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm
                      focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Optional hint" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Marks</label>
                  <input type="number" {...register("marks", { valueAsNumber: true })} min={1}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm
                      focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground
                    px-4 py-2 rounded-lg text-xs font-semibold transition">
                  {saving ? <Spinner size="sm" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
                <button type="button" onClick={() => { reset(); onEdit(); }}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground text-xs transition">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Question Drawer ───────────────────────────────────────────────────────

function AddQuestionDrawer({ assessmentId, onClose, onSuccess }: {
  assessmentId: number; onClose: () => void; onSuccess: () => void;
}) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      question_text: "", question_type: "mcq",
      option_a: "", option_b: "", option_c: "", option_d: "",
      correct_answer: "A", hint: "", marks: 1,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const qType = watch("question_type");

  const onSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    try { await teacherApi.addQuestion(assessmentId, data); onSuccess(); }
    catch { showToast("Failed to add question", "error"); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="text-lg font-bold text-foreground">Add New Question</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Question Type</label>
            <select {...register("question_type")}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground text-sm
                focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="mcq">MCQ</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer</option>
              <option value="essay">Essay</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Question Text <span className="text-destructive">*</span></label>
            <textarea {...register("question_text", { required: true })} rows={3}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground text-sm
                focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Enter question text..." />
          </div>

          {qType === "mcq" && (
            <div className="space-y-3">
              {["A","B","C","D"].map((l) => (
                <div key={l}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Option {l}</label>
                  <input {...register(`option_${l.toLowerCase()}`)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm
                      focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct Answer</label>
                <select {...register("correct_answer")}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {["A","B","C","D"].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {qType === "true_false" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct Answer</label>
              <div className="flex gap-4">
                {["True","False"].map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="radio" value={v} {...register("correct_answer")} className="accent-primary" /> {v}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hint</label>
              <input {...register("hint")}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm"
                placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Marks</label>
              <input type="number" {...register("marks", { valueAsNumber: true })} min={1}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm" />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-all">
            Cancel
          </button>
          <button type="submit" form="" onClick={handleSubmit(onSubmit)} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground
              py-2.5 rounded-xl text-sm font-semibold transition-all shadow-edtech disabled:opacity-60">
            {submitting ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
            Add Question
          </button>
        </div>
      </div>
    </>
  );
}
