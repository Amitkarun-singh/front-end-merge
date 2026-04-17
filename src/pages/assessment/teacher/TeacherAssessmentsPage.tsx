import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Plus, BookOpen, Eye, Send, AlertTriangle,
  Clock, Users, Filter, ClipboardCheck, ChevronDown,
  X, Sparkles, CheckCircle2, Loader2, BarChart3, Trash2
} from "lucide-react";
import { teacherApi, sharedApi } from "@/api/assessmentApi";
import { useToast } from "@/components/assessment/ToastProvider";
import { Spinner, ConfirmDialog } from "@/components/assessment/SharedComponents";
import { config } from "../../../../app.config.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Assessment {
  id?: number;             // may be named 'id' or 'assessment_id' depending on backend
  assessment_id?: number;
  title: string;
  subject_name?: string;  // not always present (backend uses subject_id)
  class_name: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published" | "archived";
  // flat fields (old shape)
  total_questions?: number;
  pending_questions?: number;
  approved_questions?: number;
  // nested shape returned by /teacher/my
  question_summary?: { total: number; pending: number; approved: number };
  total_marks: number;
  time_limit?: number | null;          // old shape
  time_limit_minutes?: number | null;  // new backend field
  assigned_count?: number;             // old field name
  assignment_count?: number;           // new backend field
}

interface ClassItem   { class_id: number;   class_name: string;   }
interface SubjectItem { subject_id: number;  subject_name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

type FilterTab = "all" | "draft" | "published" | "archived";
const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "draft",     label: "Draft"     },
  { key: "published", label: "Published" },
  { key: "archived",  label: "Archived"  },
];

const QTYPES = [
  { value: "mcq",          label: "MCQ"          },
  { value: "true_false",   label: "True / False" },
];

// ─── Badge helpers ────────────────────────────────────────────────────────────

const diffCls: Record<string, string> = {
  easy:   "bg-green-100 text-green-700 border border-green-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  hard:   "bg-red-100   text-red-700   border border-red-200",
};
const statCls: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600 border border-slate-200",
  published: "bg-blue-100  text-blue-700  border border-blue-200",
  archived:  "bg-gray-100  text-gray-500  border border-gray-200",
};

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

// ─── Create Form Types ────────────────────────────────────────────────────────

interface CreateFormData {
  title:         string;
  class_id:      string;
  subject_name:  string;
  topic:         string;
  difficulty:    "easy" | "medium" | "hard";
  time_limit:    string;
  num_questions: number;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherAssessmentsPage() {
  const { showToast } = useToast();
  const navigate      = useNavigate();

  const [activeTab,     setActiveTab]     = useState<FilterTab>("all");
  const [classFilter,   setClassFilter]   = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [publishingId,  setPublishingId]  = useState<number | null>(null);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  // Tracks the assessment pending deletion { id, title } — drives the in-app confirm dialog
  const [deleteTarget,  setDeleteTarget]  = useState<{ id: number; title: string } | null>(null);

  // Only pass status filter to API; class/subject are filtered client-side from names
  const queryParams: Record<string, string | number> = {};
  if (activeTab !== "all") queryParams.status = activeTab;

  const { data: allData, isLoading, error, refetch } = useQuery<Assessment[]>({
    queryKey: ["teacher-assessments", activeTab],
    queryFn: async () => {
      const res  = await teacherApi.getMyAssessments(queryParams);
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    },
    retry: false,
  });

  useEffect(() => {
    if (error) showToast("Failed to load assessments", "error");
  }, [error]);

  const handlePublish = async (id: number) => {
    setPublishingId(id);
    try {
      await teacherApi.publishAssessment(id);
      showToast("Assessment published!", "success");
      refetch();
    } catch {
      showToast("Failed to publish", "error");
    } finally {
      setPublishingId(null);
    }
  };

  // Opens the in-app confirm dialog instead of window.confirm()
  const handleDeleteClick = (id: number, title: string) => setDeleteTarget({ id, title });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(id);
    try {
      await teacherApi.deleteAssessment(id);
      showToast("Assessment deleted", "success");
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "Failed to delete assessment", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Client-side filtering by class name and subject name
  const assessments = (allData ?? []).filter((a) => {
    if (classFilter   && a.class_name   !== classFilter)   return false;
    if (subjectFilter && a.subject_name !== subjectFilter) return false;
    return true;
  });

  // Helper: resolve the real numeric ID regardless of field name from backend
  const resolveId = (a: Assessment): number | undefined =>
    a.assessment_id ?? a.id;

  return (
    <div className="p-6 lg:p-8 min-h-full bg-background">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            My Assessments
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create, review and assign assessments to your classes
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground
            px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-edtech
            hover:shadow-edtech-lg hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Create Assessment
        </button>
      </div>

      {/* ── Filter Row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-background text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="relative">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="appearance-none bg-background border border-border text-foreground text-sm
                rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Classes</option>
              {(allData ?? [])
                .map((a) => a.class_name)
                .filter((v, i, arr) => v && arr.indexOf(v) === i)
                .map((cn, i) => <option key={`class-${i}-${cn}`} value={cn}>{cn}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="appearance-none bg-background border border-border text-foreground text-sm
                rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Subjects</option>
              {(allData ?? [])
                .map((a) => a.subject_name)
                .filter((v, i, arr) => v && arr.indexOf(v) === i)
                .map((sn, i) => <option key={`subject-${i}-${sn}`} value={sn}>{sn}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-muted-foreground text-sm">Loading assessments...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary/50" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">No assessments yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first AI-powered assessment using the button above
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground
                px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Create Assessment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Title","Subject / Class","Difficulty","Status","Questions","Marks","Time","Assigned","Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide
                      ${h === "Title" ? "text-left pl-5" : h === "Actions" ? "text-right pr-5" : "text-center"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {assessments.map((a, rowIdx) => {
                  const aId = resolveId(a);
                  // Support both flat fields (old shape) and nested question_summary (new shape)
                  const totalQ    = a.question_summary?.total    ?? a.total_questions    ?? 0;
                  const pendingQ  = a.question_summary?.pending  ?? a.pending_questions  ?? 0;
                  const approvedQ = a.question_summary?.approved ?? a.approved_questions ?? 0;
                  const timeLimit = a.time_limit_minutes ?? a.time_limit ?? null;
                  const assigned  = a.assignment_count   ?? a.assigned_count ?? 0;
                  const hasPending  = pendingQ > 0;
                  const isPublishing = publishingId === (aId ?? -1);
                  return (
                    <tr key={aId ?? rowIdx} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground line-clamp-1 max-w-[200px]">{a.title}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-foreground">{a.subject_name ?? `Subject #${(a as {subject_id?: number}).subject_id ?? "—"}`}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{a.class_name}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Pill label={a.difficulty} cls={diffCls[a.difficulty] ?? diffCls.medium} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Pill label={a.status} cls={statCls[a.status] ?? statCls.draft} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <p className="font-medium text-foreground">{totalQ}</p>
                        {hasPending ? (
                          <p className="text-xs text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />{pendingQ} pending
                          </p>
                        ) : (
                          <p className="text-xs text-green-600 mt-0.5">{approvedQ} approved</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-foreground">{a.total_marks}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-muted-foreground flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5" />{timeLimit ? `${timeLimit} min` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-muted-foreground flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5" />{assigned}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => aId && navigate(`/teacher/assessments/${aId}/review`)}
                            disabled={!aId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                              bg-accent text-accent-foreground hover:bg-primary/10 hover:text-primary
                              border border-border/50 text-xs font-medium transition-all disabled:opacity-40"
                          >
                            <Eye className="w-3.5 h-3.5" />Review
                          </button>

                          {/* Results — shown for all published assessments */}
                          {a.status === "published" && (
                            <button
                              onClick={() => aId && navigate(`/teacher/assessments/${aId}/results`)}
                              disabled={!aId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200
                                text-xs font-medium transition-all disabled:opacity-40"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />Results
                            </button>
                          )}

                          {a.status === "draft" && !hasPending && totalQ > 0 && (
                            <button
                              onClick={() => aId && handlePublish(aId)}
                              disabled={isPublishing || !aId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                bg-green-50 text-green-700 hover:bg-green-100 border border-green-200
                                text-xs font-medium transition-all disabled:opacity-60"
                            >
                              {isPublishing ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
                              Publish
                            </button>
                          )}
                          {a.status === "published" && (
                            <button
                              onClick={() => aId && navigate(`/teacher/assessments/${aId}/assign`)}
                              disabled={!aId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                bg-primary text-primary-foreground hover:bg-primary/90
                                text-xs font-medium transition-all shadow-sm"
                            >
                              <Send className="w-3.5 h-3.5" />Assign
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => aId && handleDeleteClick(aId, a.title)}
                            disabled={deletingId === (aId ?? -1) || !aId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                              bg-red-50 text-red-600 hover:bg-red-100 border border-red-200
                              text-xs font-medium transition-all disabled:opacity-60"
                          >
                            {deletingId === (aId ?? -1)
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && (allData ?? []).length > 0 && (() => {
        const total    = (allData ?? []).length;
        const filtered = assessments.length;
        const isFiltered = classFilter || subjectFilter;
        return (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            {isFiltered ? `${filtered} of ${total}` : total} assessment{total !== 1 ? "s" : ""}
            {isFiltered && (
              <button onClick={() => { setClassFilter(""); setSubjectFilter(""); }}
                className="ml-2 text-primary hover:underline">Clear filters</button>
            )}
          </p>
        );
      })()}

      {drawerOpen && (
        <CreateAssessmentDrawer
          onClose={() => setDrawerOpen(false)}
          onSuccess={(newId) => {
            setDrawerOpen(false);
            refetch();
            navigate(`/teacher/assessments/${newId}/review`);
          }}
        />
      )}

      {/* ── In-app Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>?
            <br /><br />
            <span className="text-destructive font-medium">This action cannot be undone.</span>{" "}
            If students have already attempted this test, it will be archived instead of deleted to preserve their results.
          </>
        }
        confirmLabel="Delete Assessment"
        confirmClass="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Create Assessment Drawer (class → subject from real API) ─────────────────

function CreateAssessmentDrawer({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: (id: number) => void;
}) {
  const { showToast } = useToast();

  const [classes,          setClasses]          = useState<ClassItem[]>([]);
  const [subjects,         setSubjects]         = useState<SubjectItem[]>([]);
  const [chapters,         setChapters]         = useState<string[]>([]);
  const [loadingClasses,   setLoadingClasses]   = useState(true);
  const [loadingSubjects,  setLoadingSubjects]  = useState(false);
  const [loadingChapters,  setLoadingChapters]  = useState(false);
  const [selectedClassId,  setSelectedClassId]  = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(""); // for fallback hint only
  const [selectedTypes,    setSelectedTypes]    = useState<string[]>(["mcq"]);
  const [aiRunning,        setAiRunning]         = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateFormData>({
    defaultValues: { difficulty: "medium", num_questions: 10 },
  });

  const difficulty = watch("difficulty");

  // ── 1. Fetch classes on mount (same as AIPracticePage) ──
  useEffect(() => {
    const { token } = (() => {
      try {
        return JSON.parse(localStorage.getItem("schools2ai_auth") || "{}");
      } catch { return {}; }
    })();

    fetch(`${config.server}/api/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setClasses(res.data);
          if (res.data.length > 0) {
            const first = res.data[0];
            setSelectedClassId(String(first.class_id));
            setValue("class_id", String(first.class_id));
          }
        }
      })
      .catch(() => showToast("Failed to load classes", "error"))
      .finally(() => setLoadingClasses(false));
  }, []);

  // ── 2. Fetch subjects whenever class changes ──
  useEffect(() => {
    if (!selectedClassId) return;
    setLoadingSubjects(true);
    setSubjects([]);
    setChapters([]);
    setValue("subject_name", "");
    setValue("topic", "");
    setSelectedSubjectId(null);
    setSelectedSubjectName("");

    const { token, user } = (() => {
      try {
        return JSON.parse(localStorage.getItem("schools2ai_auth") || "{}");
      } catch { return {} as { token?: string; user?: { board?: string } }; }
    })();

    const board    = user?.board ?? "CBSE";
    const language = "English";

    fetch(`${config.server}/api/subjects?class_id=${selectedClassId}&board=${board}&language=${language}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setSubjects(res.data);
          if (res.data.length > 0) {
            const first = res.data[0];
            setValue("subject_name", first.subject_name);
            setSelectedSubjectId(first.subject_id);
            setSelectedSubjectName(first.subject_name);
          }
        }
      })
      .catch(() => showToast("Failed to load subjects", "error"))
      .finally(() => setLoadingSubjects(false));
  }, [selectedClassId]);

  // ── 3. Fetch chapters using class_id + subject_id (REST path params) ──
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setChapters([]);
      setValue("topic", "");
      return;
    }
    setLoadingChapters(true);
    setChapters([]);
    setValue("topic", "");

    sharedApi
      .getChaptersBySubject(selectedClassId, selectedSubjectId)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (Array.isArray(data)) {
          // Backend returns objects {chapter_id, chapter_name} or plain strings
          const names = data.map((ch: { chapter_name?: string } | string) =>
            typeof ch === "string" ? ch : ch.chapter_name ?? ""
          ).filter(Boolean);
          setChapters(names);
        }
      })
      .catch(() => setChapters([]))
      .finally(() => setLoadingChapters(false));
  }, [selectedClassId, selectedSubjectId]);

  const toggleType = (val: string) =>
    setSelectedTypes((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );

  const onSubmit = async (data: CreateFormData) => {
    if (selectedTypes.length === 0) {
      showToast("Select at least one question type", "warning");
      return;
    }
    setAiRunning(true);
    try {
      const cls = classes.find((c) => String(c.class_id) === data.class_id);
      const res = await teacherApi.createAssessment({
        title:               data.title,
        subject_id:          selectedSubjectId!,
        class_id:            Number(data.class_id),
        topic:               data.topic || undefined,
        difficulty:          data.difficulty,
        time_limit_minutes:  data.time_limit ? Number(data.time_limit) : undefined,
        question_count:      data.num_questions,
        question_types:      selectedTypes,
      });
      const newId =
        res.data?.data?.assessment?.assessment_id ??
        res.data?.data?.assessment_id ??
        res.data?.data?.id;
      showToast("Assessment created! Reviewing questions…", "success");
      onSuccess(newId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "Failed to create assessment", "error");
    } finally {
      setAiRunning(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-lg font-bold text-foreground">Create Assessment</h2>
            <p className="text-muted-foreground text-xs mt-0.5">AI will generate questions for you</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Loading overlay */}
        {aiRunning && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/95 gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-foreground text-lg animate-pulse">AI is generating questions…</h3>
              <p className="text-muted-foreground text-sm mt-1">This usually takes 10–20 seconds</p>
            </div>
          </div>
        )}

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Assessment Title <span className="text-destructive">*</span>
            </label>
            <input
              {...register("title", { required: "Title is required" })}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              placeholder="e.g. Chapter 5 – Laws of Motion Test"
            />
            {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Class (first — fetched from API) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Class <span className="text-destructive">*</span>
            </label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading classes…
              </div>
            ) : (
              <select
                {...register("class_id", { required: "Class is required" })}
                value={selectedClassId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedClassId(id);
                  setValue("class_id", id);
                }}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={String(c.class_id)}>{c.class_name}</option>
                ))}
              </select>
            )}
            {errors.class_id && <p className="text-destructive text-xs mt-1">{errors.class_id.message}</p>}
          </div>

          {/* Subject (loaded from selected class) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Subject <span className="text-destructive">*</span>
            </label>
            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading subjects…
              </div>
            ) : (
              <select
                {...register("subject_name", { required: "Subject is required" })}
                disabled={!selectedClassId || subjects.length === 0}
                onChange={(e) => {
                  const sn  = e.target.value;
                  const sub = subjects.find((s) => s.subject_name === sn);
                  setValue("subject_name", sn);
                  setSelectedSubjectId(sub?.subject_id ?? null);
                  setSelectedSubjectName(sn);
                }}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring text-sm disabled:opacity-50"
              >
                <option value="">
                  {!selectedClassId ? "Select a class first" : subjects.length === 0 ? "No subjects available" : "Select subject"}
                </option>
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_name}>{s.subject_name}</option>
                ))}
              </select>
            )}
            {errors.subject_name && <p className="text-destructive text-xs mt-1">{errors.subject_name.message}</p>}
          </div>

          {/* Topic / Chapter — dropdown if chapters loaded, text input as fallback */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Topic / Chapter</label>

            {loadingChapters ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading chapters…
              </div>
            ) : chapters.length > 0 ? (
              <select
                {...register("topic")}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                <option value="">Select chapter</option>
                {chapters.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            ) : (
              <input
                {...register("topic")}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder={
                  selectedSubjectName
                    ? "No chapters found — type a topic manually"
                    : "e.g. Newton's Laws of Motion"
                }
              />
            )}
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => {
                const sel = difficulty === d;
                const cls = {
                  easy:   sel ? "border-green-500 bg-green-50 text-green-700" : "border-border text-muted-foreground hover:border-green-300",
                  medium: sel ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border text-muted-foreground hover:border-amber-300",
                  hard:   sel ? "border-red-500   bg-red-50   text-red-700"   : "border-border text-muted-foreground hover:border-red-300",
                }[d];
                return (
                  <label key={d} className={`flex-1 flex items-center justify-center border-2 rounded-xl
                    py-2.5 cursor-pointer transition-all text-sm font-medium ${cls}`}>
                    <input type="radio" value={d} {...register("difficulty")} className="sr-only" />
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Time + Questions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Time Limit (min)</label>
              <input
                type="number" min={1}
                {...register("time_limit")}
                placeholder="No limit"
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">No. of Questions</label>
              <input
                type="number" min={1} max={50}
                {...register("num_questions", { valueAsNumber: true, min: 1 })}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Question Types</label>
            <div className="grid grid-cols-2 gap-2">
              {QTYPES.map((qt) => {
                const checked = selectedTypes.includes(qt.value);
                return (
                  <label key={qt.value}
                    className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all text-sm font-medium
                      ${checked ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleType(qt.value)} className="sr-only" />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${checked ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    {qt.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium
              text-muted-foreground hover:bg-accent transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={aiRunning || loadingClasses}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
              text-primary-foreground py-2.5 rounded-xl text-sm font-semibold transition-all
              shadow-edtech disabled:opacity-60"
          >
            {aiRunning
              ? <><Spinner size="sm" /> Generating…</>
              : <><Sparkles className="w-4 h-4" /> Generate with AI</>}
          </button>
        </div>
      </div>
    </>
  );
}
