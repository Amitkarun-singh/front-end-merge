import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, Send, Calendar, Shuffle, Users, Loader2, CheckCircle2, Lock,
} from "lucide-react";
import { teacherApi } from "@/api/assessmentApi";
import { Spinner } from "@/components/assessment/SharedComponents";
import { useToast } from "@/components/assessment/ToastProvider";
import { config } from "../../../../app.config.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionItem { section_id: number; section_name: string; }

interface FormData {
  start_datetime: string;
  end_datetime: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string {
  try {
    return JSON.parse(localStorage.getItem("schools2ai_auth") || "{}").token ?? "";
  } catch { return ""; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const assessmentId = Number(id);

  // ── Assessment class (locked from the assessment itself) ───────────────────
  const [assessmentClassId, setAssessmentClassId] = useState<number | null>(null);
  const [assessmentClassName, setAssessmentClassName] = useState<string>("");
  const [loadingAssessment, setLoadingAssessment] = useState(true);

  // ── Sections ───────────────────────────────────────────────────────────────
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({
      defaultValues: {
        shuffle_questions: true,
        shuffle_options: true,
        show_result_immediately: true,
      },
    });

  // Current local datetime in datetime-local format (YYYY-MM-DDTHH:MM)
  function nowLocalIso() {
    const now = new Date();
    now.setSeconds(0, 0);
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }

  const watchedStart = watch("start_datetime");

  // ── 1. Fetch assessment to get its locked class_id ─────────────────────────
  useEffect(() => {
    if (!assessmentId) return;
    setLoadingAssessment(true);
    teacherApi.getAssessmentQuestions(assessmentId)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        const assessment = data?.assessment ?? data;
        const cid = assessment?.class_id ?? null;
        const cname = assessment?.class_name ?? (cid ? `Class ${cid}` : "Unknown class");
        setAssessmentClassId(cid);
        setAssessmentClassName(cname);
      })
      .catch(() => showToast("Failed to load assessment details", "error"))
      .finally(() => setLoadingAssessment(false));
  }, [assessmentId]);

  // ── 2. Fetch sections once we know the locked class ────────────────────────
  useEffect(() => {
    if (!assessmentClassId) { setSections([]); return; }
    setLoadingSections(true);
    setSections([]);
    setSelectedSections([]);

    const token = getToken();
    fetch(`${config.server}/api/V1/class/${assessmentClassId}/sections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        const data = res.data ?? res;
        setSections(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("[Sections] fetch error:", err);
        showToast("Failed to load sections", "error");
      })
      .finally(() => setLoadingSections(false));
  }, [assessmentClassId]);

  const toggleSection = (sid: number) =>
    setSelectedSections((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    if (!assessmentClassId) { showToast("Assessment class not found", "error"); return; }
    if (selectedSections.length === 0) { showToast("Please select at least one section", "warning"); return; }

    setSubmitting(true);
    try {
      await teacherApi.assignAssessment(assessmentId, {
        class_id: assessmentClassId,
        section_ids: selectedSections,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
        shuffle_questions: data.shuffle_questions,
        shuffle_options: data.shuffle_options,
        show_result_immediately: data.show_result_immediately,
      });
      showToast("Assessment assigned successfully!", "success");
      navigate("/teacher/assessments");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "Failed to assign assessment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle options config ─────────────────────────────────────────────────
  const toggleOptions = [
    {
      field: "shuffle_questions" as const,
      label: "Shuffle Questions",
      desc: "Randomize question order for each student",
    },
    {
      field: "shuffle_options" as const,
      label: "Shuffle Options",
      desc: "Randomize MCQ answer options per student",
    },
    {
      field: "show_result_immediately" as const,
      label: "Show Result Immediately",
      desc: "Students see their score right after submitting",
    },
  ];

  // ── Shared field style ────────────────────────────────────────────────────
  const fieldCls = `w-full bg-muted border border-input rounded-xl px-4 py-3 text-foreground
    focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate("/teacher/assessments")}
          className="p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground
            hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assign Assessment</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configure and send to students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Step 1: Class (locked) & Sections ─────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center
              text-primary-foreground text-xs font-bold">1</span>
            <Users className="w-4 h-4 text-primary" />
            Class &amp; Sections
          </h3>

          {/* Locked class display */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Class
            </label>
            {loadingAssessment ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading assessment…
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-muted/60 border border-input
                rounded-xl px-4 py-3 text-sm">
                <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-foreground">{assessmentClassName}</span>
              </div>
            )}
          </div>

          {/* Sections */}
          {assessmentClassId && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                Sections <span className="text-destructive">*</span>
                {loadingSections && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
              </label>

              {loadingSections ? (
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : sections.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">
                  No sections found for this class.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sections.map((s) => {
                    const selected = selectedSections.includes(s.section_id);
                    return (
                      <button
                        key={s.section_id}
                        type="button"
                        onClick={() => toggleSection(s.section_id)}
                        className={`relative px-4 py-2 rounded-xl text-sm font-medium border
                          transition-all duration-150 flex items-center gap-1.5 ${selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                      >
                        {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {s.section_name}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSections.length === 0 && sections.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                  ⚠ Select at least one section to continue
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Step 2: Schedule ─────────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center
              text-primary-foreground text-xs font-bold">2</span>
            <Calendar className="w-4 h-4 text-primary" />
            Schedule
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Start Date &amp; Time <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                {...register("start_datetime", {
                  required: "Start time is required",
                  validate: (v) =>
                    !v || new Date(v) > new Date()
                      ? true
                      : "Start time must be in the future",
                })}
                min={nowLocalIso()}
                className={fieldCls}
              />
              {errors.start_datetime && (
                <p className="text-destructive text-xs mt-1">{errors.start_datetime.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                End Date &amp; Time <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                {...register("end_datetime", {
                  required: "End time is required",
                  validate: (v) =>
                    !v || !watchedStart || new Date(v) > new Date(watchedStart)
                      ? true
                      : "End time must be after start time",
                })}
                min={watchedStart || nowLocalIso()}
                className={fieldCls}
              />
              {errors.end_datetime && (
                <p className="text-destructive text-xs mt-1">{errors.end_datetime.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Step 3: Options ───────────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-1 shadow-sm">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center
              text-primary-foreground text-xs font-bold">3</span>
            <Shuffle className="w-4 h-4 text-primary" />
            Options
          </h3>

          {toggleOptions.map(({ field, label, desc }) => {
            const val = watch(field);
            return (
              <div
                key={field}
                className="flex items-center justify-between gap-4 py-3
                  border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue(field, !val)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0
                    ${val ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm
                      transition-all duration-200 ${val ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            );
          })}
        </section>

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting || !assessmentClassId || selectedSections.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90
            disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl
            text-primary-foreground font-semibold text-sm transition-all shadow-edtech"
        >
          {submitting ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
          {submitting ? "Assigning…" : "Assign Assessment"}
        </button>
      </form>
    </div>
  );
}
