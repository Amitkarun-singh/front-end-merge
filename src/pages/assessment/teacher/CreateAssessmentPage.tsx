import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ChevronRight, CheckCircle2, Sparkles, BookOpen, ArrowLeft, Loader2,
} from "lucide-react";
import { teacherApi, sharedApi } from "@/api/assessmentApi";
import { Spinner } from "@/components/assessment/SharedComponents";
import { useToast } from "@/components/assessment/ToastProvider";
import { config } from "../../../../app.config.js";

const STEPS = ["Setup", "AI Generates", "Review Questions"];

const QUESTION_TYPES = [
  { value: "mcq",          label: "MCQ" },
  { value: "true_false",   label: "True / False" },
];

interface ClassItem   { class_id: number; class_name: string; }
interface SubjectItem { subject_id: number; subject_name: string; }

interface FormData {
  title:         string;
  class_id:      string;
  subject_name:  string;
  topic:         string;
  difficulty:    "easy" | "medium" | "hard";
  time_limit:    string;
  num_questions: number;
}

// ── Token helper ──────────────────────────────────────────────────────────────
function getAuth(): { token: string; board: string } {
  try {
    const parsed = JSON.parse(localStorage.getItem("schools2ai_auth") || "{}");
    return {
      token: parsed?.token ?? "",
      board: parsed?.user?.board ?? "CBSE",
    };
  } catch {
    return { token: "", board: "CBSE" };
  }
}

export default function CreateAssessmentPage() {
  const navigate     = useNavigate();
  const { showToast } = useToast();
  const [step,          setStep]          = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [aiWarning,     setAiWarning]     = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["mcq"]);

  // ── Cascading dropdown state ──────────────────────────────────────────────
  const [classes,          setClasses]          = useState<ClassItem[]>([]);
  const [subjects,         setSubjects]         = useState<SubjectItem[]>([]);
  const [chapters,         setChapters]         = useState<string[]>([]);
  const [selectedClassId,  setSelectedClassId]  = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState(""); // fallback hint only

  const [loadingClasses,  setLoadingClasses]  = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({ defaultValues: { difficulty: "medium", num_questions: 10 } });

  const difficulty = watch("difficulty");

  // ── 1. Fetch classes on mount ─────────────────────────────────────────────
  useEffect(() => {
    const { token } = getAuth();
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

  // ── 2. Fetch subjects whenever class changes ──────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return;
    setLoadingSubjects(true);
    setSubjects([]);
    setChapters([]);
    setValue("subject_name", "");
    setValue("topic", "");
    setSelectedSubjectId(null);
    setSelectedSubjectName("");

    const { token, board } = getAuth();
    fetch(
      `${config.server}/api/subjects?class_id=${selectedClassId}&board=${board}&language=English`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
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

  // ── 3. Fetch chapters using class_id + subject_id (REST path params) ─────────
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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setStep(1);
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
      // DEBUG: log full response to find correct path
      console.log("[createAssessment] full res.data:", JSON.stringify(res.data, null, 2));

      const d = res.data;
      const newId =
        d?.data?.assessment?.assessment_id ??
        d?.data?.assessment_id ??
        d?.data?.id ??
        d?.assessment?.assessment_id ??
        d?.assessment_id ??
        d?.id;

      console.log("[createAssessment] resolved newId:", newId);

      if (!newId) {
        showToast("Assessment created but could not get ID. Check console.", "warning");
        navigate("/teacher/assessments");
        return;
      }

      if (res.status === 207) {
        setAiWarning(true);
        showToast("AI generation failed — questions can be added manually.", "warning");
      }
      setStep(2);
      navigate(`/teacher/assessments/${newId}/review`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "Failed to create assessment", "error");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input/select style ─────────────────────────────────────────────
  const fieldCls = `w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
    transition-all text-sm`;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 lg:p-8 max-w-3xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate("/teacher/assessments")}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        My Assessments
      </button>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? "bg-green-500 text-white"
                  : i === step ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                  : "bg-white/10 text-white/30"
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${
                i === step ? "text-white" : i < step ? "text-green-400" : "text-white/30"
              }`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-white/20 mx-3 flex-1" />}
          </div>
        ))}
      </div>

      {/* AI Loading */}
      {loading && step === 1 && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin" />
            <Sparkles className="w-7 h-7 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white animate-pulse">AI is generating your questions...</h2>
            <p className="text-white/50 text-sm mt-2">This usually takes 10–20 seconds</p>
          </div>
        </div>
      )}

      {/* AI Warning */}
      {aiWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-amber-400 text-xl">⚠</span>
          <p className="text-amber-300 text-sm">AI generation failed. You can add questions manually in the Review step.</p>
        </div>
      )}

      {/* Step 1: Form */}
      {step === 0 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Assessment Setup
            </h2>

            {/* Title */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                Assessment Title <span className="text-red-400">*</span>
              </label>
              <input
                {...register("title", { required: "Title is required" })}
                className={fieldCls + " placeholder:text-white/30"}
                placeholder="e.g. Chapter 5 – Laws of Motion Test"
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                Class <span className="text-red-400">*</span>
              </label>
              {loadingClasses ? (
                <div className="flex items-center gap-2 text-white/40 text-sm py-3">
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
                  className={fieldCls}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={String(c.class_id)}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              )}
              {errors.class_id && <p className="text-red-400 text-xs mt-1">{errors.class_id.message}</p>}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                Subject <span className="text-red-400">*</span>
              </label>
              {loadingSubjects ? (
                <div className="flex items-center gap-2 text-white/40 text-sm py-3">
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
                  className={fieldCls + " disabled:opacity-50"}
                >
                  <option value="">
                    {!selectedClassId
                      ? "Select a class first"
                      : subjects.length === 0
                      ? "No subjects available"
                      : "Select subject"}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_name}>
                      {s.subject_name}
                    </option>
                  ))}
                </select>
              )}
              {errors.subject_name && (
                <p className="text-red-400 text-xs mt-1">{errors.subject_name.message}</p>
              )}
            </div>

            {/* Topic / Chapter – dropdown when chapters available, text input as fallback */}
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Topic / Chapter</label>

              {loadingChapters ? (
                <div className="flex items-center gap-2 text-white/40 text-sm py-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading chapters…
                </div>
              ) : chapters.length > 0 ? (
                <select
                  {...register("topic")}
                  className={fieldCls}
                >
                  <option value="">Select chapter</option>
                  {chapters.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              ) : (
                <input
                  {...register("topic")}
                  className={fieldCls + " placeholder:text-white/30"}
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
              <label className="block text-sm text-white/70 mb-2">Difficulty</label>
              <div className="flex gap-3">
                {(["easy", "medium", "hard"] as const).map((d) => {
                  const checked = difficulty === d;
                  const colors = {
                    easy:   checked ? "border-green-500 bg-green-500/10 text-green-400" : "border-white/10 text-white/50",
                    medium: checked ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/10 text-white/50",
                    hard:   checked ? "border-red-500 bg-red-500/10 text-red-400"       : "border-white/10 text-white/50",
                  };
                  return (
                    <label key={d} className={`flex-1 flex items-center justify-center gap-2 border rounded-xl
                      py-2.5 cursor-pointer transition-all text-sm font-medium ${colors[d]}`}>
                      <input type="radio" value={d} {...register("difficulty")} className="sr-only" />
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Time Limit + Num Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">Time Limit (minutes)</label>
                <input
                  type="number"
                  {...register("time_limit")}
                  className={fieldCls + " placeholder:text-white/30"}
                  placeholder="No limit"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1.5">Number of Questions</label>
                <input
                  type="number"
                  {...register("num_questions", { valueAsNumber: true, min: 1 })}
                  className={fieldCls}
                  min={1} max={50}
                />
              </div>
            </div>

            {/* Question Types */}
            <div>
              <label className="block text-sm text-white/70 mb-2">Question Types</label>
              <div className="grid grid-cols-2 gap-2">
                {QUESTION_TYPES.map((qt) => {
                  const checked = selectedTypes.includes(qt.value);
                  return (
                    <label key={qt.value} className={`flex items-center gap-3 border rounded-xl px-4 py-3
                      cursor-pointer transition-all ${checked
                        ? "border-indigo-500 bg-indigo-600/10 text-indigo-300"
                        : "border-white/10 text-white/50 hover:border-white/20"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleType(qt.value)} className="sr-only" />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        checked ? "border-indigo-500 bg-indigo-600" : "border-white/30"}`}>
                        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{qt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-60 py-3.5 rounded-xl text-white font-semibold text-sm transition-all
              shadow-lg shadow-indigo-900/30"
          >
            {loading ? <><Spinner size="sm" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate with AI</>}
          </button>
        </form>
      )}
    </div>
  );
}
