import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, Send, Calendar, Shuffle, Users, Loader2, CheckCircle2,
} from "lucide-react";
import { teacherApi } from "@/api/assessmentApi";
import { Spinner } from "@/components/assessment/SharedComponents";
import { useToast } from "@/components/assessment/ToastProvider";
import { config } from "../../../../app.config.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassItem    { class_id: number; class_name: string; }
interface SectionItem  { section_id: number; section_name: string; }

interface FormData {
  start_datetime: string;
  end_datetime:   string;
  shuffle_questions:       boolean;
  shuffle_options:         boolean;
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
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { showToast } = useToast();
  const assessmentId = Number(id);

  // ── State ──────────────────────────────────────────────────────────────────
  const [classes,         setClasses]         = useState<ClassItem[]>([]);
  const [sections,        setSections]        = useState<SectionItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [loadingClasses,  setLoadingClasses]  = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting,      setSubmitting]      = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({
      defaultValues: {
        shuffle_questions:       false,
        shuffle_options:         false,
        show_result_immediately: false,
      },
    });

  // ── 1. Fetch classes ───────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    fetch(`${config.server}/api/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setClasses(res.data);
      })
      .catch(() => showToast("Failed to load classes", "error"))
      .finally(() => setLoadingClasses(false));
  }, []);

  // ── 2. Fetch sections when class changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) { setSections([]); return; }
    setLoadingSections(true);
    setSections([]);
    setSelectedSections([]);

    const token = getToken();
    const url = `${config.server}/api/class/${selectedClassId}/sections`;
    console.log("[Sections] calling URL:", url);

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        console.log("[Sections] raw response:", JSON.stringify(res, null, 2));
        const data = res.data ?? res;
        console.log("[Sections] parsed data:", data);
        setSections(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("[Sections] fetch error:", err);
        showToast("Failed to load sections", "error");
      })
      .finally(() => setLoadingSections(false));
  }, [selectedClassId]);

  const toggleSection = (sid: number) =>
    setSelectedSections((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    if (!selectedClassId) { showToast("Please select a class", "warning"); return; }
    if (selectedSections.length === 0) { showToast("Please select at least one section", "warning"); return; }

    setSubmitting(true);
    try {
      await teacherApi.assignAssessment(assessmentId, {
        class_id:                selectedClassId,
        section_ids:             selectedSections,
        start_datetime:          new Date(data.start_datetime).toISOString(),
        end_datetime:            new Date(data.end_datetime).toISOString(),
        shuffle_questions:       data.shuffle_questions,
        shuffle_options:         data.shuffle_options,
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
      desc:  "Randomize question order for each student",
    },
    {
      field: "shuffle_options" as const,
      label: "Shuffle Options",
      desc:  "Randomize MCQ answer options per student",
    },
    {
      field: "show_result_immediately" as const,
      label: "Show Result Immediately",
      desc:  "Students see their score right after submitting",
    },
  ];

  // ── Shared field style ────────────────────────────────────────────────────
  const fieldCls = `w-full bg-muted border border-input rounded-xl px-4 py-3 text-foreground
    focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background p-6 lg:p-8 max-w-2xl mx-auto">

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

        {/* ── Step 1: Class & Sections ─────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center
              text-primary-foreground text-xs font-bold">1</span>
            <Users className="w-4 h-4 text-primary" />
            Select Class &amp; Sections
          </h3>

          {/* Class dropdown */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Class <span className="text-destructive">*</span>
            </label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading classes…
              </div>
            ) : (
              <select
                value={selectedClassId ?? ""}
                onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                className={fieldCls}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Sections */}
          {selectedClassId && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                Sections
                {loadingSections && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
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
                          transition-all duration-150 flex items-center gap-1.5 ${
                          selected
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
                {...register("start_datetime", { required: "Start time is required" })}
                className={fieldCls + " [color-scheme:dark]"}
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
                {...register("end_datetime", { required: "End time is required" })}
                className={fieldCls + " [color-scheme:dark]"}
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
          disabled={submitting || !selectedClassId || selectedSections.length === 0}
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
