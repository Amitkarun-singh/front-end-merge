import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  BookOpen,
  ChevronRight,
  Sparkles,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { config } from "../../app.config.js";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/context/AuthContext";
import { getClasses, getStreams, getSubjects, getChapters } from "@/api/curriculum";
import type { Class, Stream, Subject, Chapter } from "@/api/curriculum";

interface AINote {
  topic: string;
  short_notes: string;
  full_notes: string;   // raw S3 key (kept for reference)
  pdfUrl: string;       // pre-signed URL for full notes PDF
  bookUrl: string;      // pre-signed URL for book PDF
}

// ─────────────────────────────────────────────────────────────
// Normalise raw short_notes string before passing to ReactMarkdown
// ─────────────────────────────────────────────────────────────

/**
 * The DB stores standard markdown with LaTeX delimiters:
 *   block  → \[ ... \]    inline → \( ... \)
 *
 * Problem: markdown's escape processor turns \[ → [ and \( → ( BEFORE
 * remark-math can parse them, so KaTeX never renders them.
 *
 * Fix:
 *  1. Un-escape literal \n sequences.
 *  2. Strip the first # H1 heading — duplicates the card header title.
 *  3. Convert \[ ... \] → $$ ... $$ (block math, on own lines).
 *  4. Convert \( ... \) → $ ... $  (inline math).
 *  "$" is not a markdown escape target, so remark-math sees it cleanly.
 */
const normaliseNotes = (raw: string): string => {
  let text = raw
    .replace(/\\n/g, "\n")     // literal "\n" two-char → real newline
    .replace(/^\)\s*/m, "");   // strip accidental leading ")" artifact

  // Remove the very first H1 heading (already shown in the card header above)
  text = text.replace(/^#\s+.+\n?/, "");

  // Convert block math  \[ ... \]  →  $$ ... $$  (surrounded by blank lines)
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, math) => `\n\n$$\n${math.trim()}\n$$\n\n`);

  // Convert inline math  \( ... \)  →  $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_m, math) => `$${math}$`);

  return text;
};

// ─────────────────────────────────────────────────────────────
// Custom ReactMarkdown component renderers — clean & consistent
// ─────────────────────────────────────────────────────────────

/**
 * Design system:
 * - Each H2 section gets a colour theme (violet → blue → emerald → amber → rose → cyan).
 * - Every element INSIDE that section inherits the same accent colour → unified look.
 * - Bullet dots match the section accent colour (no random emojis).
 * - Bold text → yellow highlighter style (like a pen marker).
 * - Ordered steps → single primary gradient badge (consistent across all lists).
 * - H3 → left accent bar in the current section colour.
 * - Math blocks → soft tinted card.
 */

// Six section colour themes — purely position-driven, never random
const SECTION_THEMES = [
  {
    sectionBg: "bg-violet-50/70 dark:bg-violet-950/20",
    leftBorder: "border-l-4 border-violet-400",
    headerBg: "bg-violet-100 dark:bg-violet-900/50",
    headerText: "text-violet-800 dark:text-violet-200",
    dot: "bg-violet-400",
    h3Bar: "bg-violet-300 dark:bg-violet-600",
    badge: "bg-violet-500",
  },
  {
    sectionBg: "bg-blue-50/70 dark:bg-blue-950/20",
    leftBorder: "border-l-4 border-blue-400",
    headerBg: "bg-blue-100 dark:bg-blue-900/50",
    headerText: "text-blue-800 dark:text-blue-200",
    dot: "bg-blue-400",
    h3Bar: "bg-blue-300 dark:bg-blue-600",
    badge: "bg-blue-500",
  },
  {
    sectionBg: "bg-emerald-50/70 dark:bg-emerald-950/20",
    leftBorder: "border-l-4 border-emerald-400",
    headerBg: "bg-emerald-100 dark:bg-emerald-900/50",
    headerText: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-400",
    h3Bar: "bg-emerald-300 dark:bg-emerald-600",
    badge: "bg-emerald-500",
  },
  {
    sectionBg: "bg-amber-50/70 dark:bg-amber-950/20",
    leftBorder: "border-l-4 border-amber-400",
    headerBg: "bg-amber-100 dark:bg-amber-900/50",
    headerText: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-400",
    h3Bar: "bg-amber-300 dark:bg-amber-600",
    badge: "bg-amber-500",
  },
  {
    sectionBg: "bg-rose-50/70 dark:bg-rose-950/20",
    leftBorder: "border-l-4 border-rose-400",
    headerBg: "bg-rose-100 dark:bg-rose-900/50",
    headerText: "text-rose-800 dark:text-rose-200",
    dot: "bg-rose-400",
    h3Bar: "bg-rose-300 dark:bg-rose-600",
    badge: "bg-rose-500",
  },
  {
    sectionBg: "bg-cyan-50/70 dark:bg-cyan-950/20",
    leftBorder: "border-l-4 border-cyan-400",
    headerBg: "bg-cyan-100 dark:bg-cyan-900/50",
    headerText: "text-cyan-800 dark:text-cyan-200",
    dot: "bg-cyan-400",
    h3Bar: "bg-cyan-300 dark:bg-cyan-600",
    badge: "bg-cyan-500",
  },
] as const;

// Section-level counters (reset before each render)
let _sectionIdx = 0;
let _listItemIdx = 0;
let _globalItemIdx = 0;   // advances across ALL lists — drives emoji cycling

// Current section theme snapshot — set when H2 is rendered so child elements share it
let _currentTheme: any = SECTION_THEMES[0];

/**
 * Study-themed emoji set — cycles deterministically by global item index.
 * Every position in the document always gets the same emoji → intentional variety.
 * Grouped: knowledge → math → achievement → exploration → focus → insight
 */
const BULLET_EMOJIS = [
  "📌", "🔑", "💡", "📖",   // knowledge
  "🔢", "📐", "🧮", "➗",   // math/formula
  "🎯", "✅", "⭐", "🏆",   // achievement
  "🔍", "🗺️", "🌐", "🧩",  // exploration
  "⚡", "🚀", "💫", "🌟",   // energy/focus
  "🧠", "💭", "🔬", "📊",   // insight/analysis
] as const;

const makeComponents = () => ({
  // ── H2 — full-width section card with left colour bar ──────────────────────
  h2({ children }: { children?: React.ReactNode }) {
    const theme = SECTION_THEMES[_sectionIdx % SECTION_THEMES.length];
    _currentTheme = theme;
    _sectionIdx++;
    return (
      <div className={`mt-6 mb-3 rounded-xl overflow-hidden shadow-sm border border-border/40`}>
        {/* Accent top bar */}
        <div className={`h-1 w-full ${theme.badge}`} />
        <div className={`flex items-center gap-3 px-4 py-3 ${theme.sectionBg} ${theme.leftBorder}`}>
          {/* Coloured section number circle */}
          <span className={`flex-shrink-0 w-7 h-7 rounded-full ${theme.badge} text-white text-xs font-bold flex items-center justify-center`}>
            {_sectionIdx}
          </span>
          <h2 className={`font-bold text-sm ${theme.headerText}`}>{children}</h2>
        </div>
      </div>
    );
  },

  // ── H3 — left coloured accent bar + bold label ─────────────────────────────
  h3({ children }: { children?: React.ReactNode }) {
    const t = _currentTheme;
    return (
      <div className={`flex items-stretch gap-2.5 mt-4 mb-2`}>
        <div className={`w-1 rounded-full flex-shrink-0 ${t.h3Bar}`} />
        <h3 className="text-sm font-semibold text-foreground leading-snug py-0.5">{children}</h3>
      </div>
    );
  },

  // ── H1 — stripped by normaliseNotes; fallback only ─────────────────────────
  h1({ children }: { children?: React.ReactNode }) {
    return (
      <h1 className="text-lg font-bold text-foreground mt-2 mb-4 pb-2 border-b border-border">
        {children}
      </h1>
    );
  },

  // ── Unordered list ──────────────────────────────────────────────────────────
  ul({ children }: { children?: React.ReactNode }) {
    _listItemIdx = 0;   // reset per-list idx (for future use)
    return <ul className="space-y-1.5 my-2">{children}</ul>;
  },

  // ── Ordered list ────────────────────────────────────────────────────────────
  ol({ children }: { children?: React.ReactNode }) {
    _listItemIdx = 0;
    return <ol className="space-y-2 my-2">{children}</ol>;
  },

  // ── List item — emoji + coloured dot (UL) or coloured badge number (OL) ─────
  li({ children, ordered }: { children?: React.ReactNode; ordered?: boolean }) {
    const idx = _listItemIdx++;
    const t = _currentTheme;

    if (ordered) {
      // Ordered steps: section-coloured numbered badge — consistent per section
      return (
        <li className="flex items-start gap-3">
          <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full ${t.badge} text-white text-xs font-bold flex items-center justify-center shadow-sm`}>
            {idx + 1}
          </span>
          <span className="text-muted-foreground text-sm leading-relaxed flex-1">{children}</span>
        </li>
      );
    }

    // Unordered: emoji (cycles by global position) + coloured accent dot (section colour)
    const emoji = BULLET_EMOJIS[_globalItemIdx % BULLET_EMOJIS.length];
    _globalItemIdx++;

    return (
      <li className="flex items-start gap-2">
        {/* Deterministic emoji — same position always gets same emoji */}
        <span className="flex-shrink-0 text-base leading-none mt-0.5" role="presentation">{emoji}</span>
        {/* Coloured dot — ties the item visually to its section */}
        <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-[7px] ${t.dot}`} />
        <span className="text-muted-foreground text-sm leading-relaxed flex-1">{children}</span>
      </li>
    );
  },

  // ── Paragraph ───────────────────────────────────────────────────────────────
  p({ children }: { children?: React.ReactNode }) {
    return <p className="text-muted-foreground text-sm leading-relaxed mb-2">{children}</p>;
  },

  // ── Bold — yellow highlighter marker effect ─────────────────────────────────
  strong({ children }: { children?: React.ReactNode }) {
    return (
      <strong className="font-semibold text-foreground bg-yellow-200/60 dark:bg-yellow-800/30 px-1 py-0.5 rounded-sm">
        {children}
      </strong>
    );
  },

  // ── Italic ──────────────────────────────────────────────────────────────────
  em({ children }: { children?: React.ReactNode }) {
    return <em className="italic text-muted-foreground/80">{children}</em>;
  },

  // ── Blockquote — "Note" box ─────────────────────────────────────────────────
  blockquote({ children }: { children?: React.ReactNode }) {
    return (
      <div className="flex gap-3 my-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-400">
        <div className="w-1 flex-shrink-0" />
        <div className="text-blue-800 dark:text-blue-200 text-sm italic">{children}</div>
      </div>
    );
  },

  // ── Table ───────────────────────────────────────────────────────────────────
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="overflow-x-auto my-4 rounded-xl border border-border shadow-sm">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    );
  },
  thead({ children }: { children?: React.ReactNode }) {
    return <thead className="bg-primary/10">{children}</thead>;
  },
  th({ children }: { children?: React.ReactNode }) {
    return <th className="text-left px-4 py-2.5 font-semibold text-foreground border-b border-border text-xs uppercase tracking-wide">{children}</th>;
  },
  td({ children }: { children?: React.ReactNode }) {
    return <td className="px-4 py-2.5 text-muted-foreground border-b border-border/40 text-sm">{children}</td>;
  },
  tr({ children, ...props }: { children?: React.ReactNode;[k: string]: unknown }) {
    return <tr className="even:bg-muted/20 hover:bg-muted/30 transition-colors duration-150" {...props}>{children}</tr>;
  },

  // ── Inline code ─────────────────────────────────────────────────────────────
  code({ children, className }: { children?: React.ReactNode; className?: string }) {
    if (!className) {
      return <code className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-xs">{children}</code>;
    }
    return <code className={`${className} block rounded-lg p-3 bg-muted font-mono text-xs overflow-x-auto my-2`}>{children}</code>;
  },

  // ── Horizontal rule — section divider ───────────────────────────────────────
  hr() {
    return (
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="w-1.5 h-1.5 rounded-full bg-border" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      </div>
    );
  },
});

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

type PreviewMode = "notes" | "book" | null;

export default function AINotesPage() {
  const [languages, setLanguages] = useState<string[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [language, setLanguage] = useState("");
  const [stream, setStream] = useState("");
  // Pre-seed className from profile so subjects load immediately after language pick
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const [note, setNote] = useState<AINote | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // PDF preview — which panel is open: 'notes', 'book', or null
  const [previewMode, setPreviewMode] = useState<PreviewMode>(null);

  // Warning shown when user tries to open book before generating notes
  const [showBookWarning, setShowBookWarning] = useState(false);

  // Derived: is the selected class one that requires a stream?
  const needsStream = className === "11" || className === "12";

  const { token, user } = useAuth();

  // Derive role & profile class
  const rawRole = typeof user?.role === "string"
    ? user.role
    : (user?.role as Record<string, unknown>)?.name as string | undefined;
  const isStudent = rawRole?.toLowerCase() === "student";

  // user.class_name may hold "Grade 10", user.class may hold "10" — handle both
  const rawProfileClass = user?.class_name
    ? String(user.class_name).replace(/^grade\s*/i, "").trim()
    : user?.class
      ? String(user.class).replace(/^grade\s*/i, "").trim()
      : null;
  // profileClass = plain number string (e.g. "10") or null for non-students / no class
  const profileClass = isStudent && rawProfileClass ? rawProfileClass : null;
  // Display label shown in the locked field (e.g. "Grade 10")
  const profileClassLabel = profileClass ? `Grade ${profileClass}` : null;

  // Board: derived from user profile or fallback to "CBSE" — not user-selectable
  const board = (user?.board as string) || "CBSE";

  const resetNotes = () => {
    setShowNotes(false);
    setNote(null);
    setPreviewMode(null);
    setShowBookWarning(false);
  };

  // Helper to reset stream-dependent downstream state
  const resetStream = () => {
    setStream("");
    setSubjects([]);
    setChapters([]);
    setSubject("");
    setSelectedChapter(null);
    resetNotes();
  };

  // ── Fetch languages ──
  useEffect(() => {
    fetch(`${config.server}/api/v1/ainote/languages`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list: string[] = data.data || [];
        setLanguages(list);
        // Auto-select English if available and no language chosen yet
        if (!language) {
          const english = list.find((l) => l.toLowerCase() === "english");
          if (english) setLanguage(english);
        }
      });
  }, []);

  // ── Fetch classes (requires language; board is derived automatically) ──
  // Students with a profile class skip the API — their class is already known.
  useEffect(() => {
    if (!language) { setClasses([]); return; }

    if (profileClass) {
      const fetchClassesForStudent = async () => {
        try {
          const fetchedClasses = await getClasses(token, "ai-notes");
          if (Array.isArray(fetchedClasses)) {
            setClasses(fetchedClasses);
            setClassName(profileClass);
          }
        } catch (error) {
          console.error("Error fetching class list:", error);
        }
      };
      fetchClassesForStudent();
      return;
    }

    const fetchClasses = async () => {
      try {
        const fetchedClasses = await getClasses(token, "ai-notes");
        if (Array.isArray(fetchedClasses)) {
          setClasses(fetchedClasses);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, [language, token, profileClass]);

  // ── Fetch streams (only for class 11 & 12; board is derived automatically) ──
  useEffect(() => {
    if (!needsStream || !language) { setStreams([]); setStream(""); return; }

    const fetchStreams = async () => {
      try {
        const fetchedStreams = await getStreams(token);
        if (Array.isArray(fetchedStreams)) {
          setStreams(fetchedStreams);
          setStream(""); // reset stream on class change
        }
      } catch (error) {
        console.error("Error fetching streams:", error);
      }
    };
    fetchStreams();
  }, [needsStream, language, token]);

  // ── Fetch subjects (requires language + class; + stream if class 11/12) ──
  useEffect(() => {
    if (!language || !className) { setSubjects([]); return; }
    if (needsStream && !stream) { setSubjects([]); return; }

    const currentClass = classes.find((c) => c.slug === className);
    if (!currentClass) return;

    const generalStream = streams.find(
      (s) => s.stream_name.toLowerCase() === "general" || s.slug === "general"
    );
    const defaultStreamId = generalStream ? generalStream.id : 4;

    const currentStream = streams.find((s) => s.stream_name === stream);

    const fetchSubjectsData = async () => {
      try {
        const fetchedSubjects = await getSubjects(
          token,
          currentClass.id,
          board,
          needsStream && currentStream ? currentStream.id : defaultStreamId,
          language
        );
        if (Array.isArray(fetchedSubjects)) {
          setSubjects(fetchedSubjects);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };
    fetchSubjectsData();
  }, [language, className, stream, needsStream, classes, streams, token, board]);

  // ── Fetch chapters (requires language + class + subject; + stream if 11/12) ──
  useEffect(() => {
    if (!language || !className || !subject) { setChapters([]); return; }
    if (needsStream && !stream) { setChapters([]); return; }

    const currentClass = classes.find((c) => c.slug === className);
    const currentSubject = subjects.find((s) => s.subject_name === subject);
    if (!currentClass || !currentSubject) return;

    const generalStream = streams.find(
      (s) => s.stream_name.toLowerCase() === "general" || s.slug === "general"
    );
    const defaultStreamId = generalStream ? generalStream.id : 4;

    const currentStream = streams.find((s) => s.stream_name === stream);

    const fetchChaptersData = async () => {
      try {
        const fetchedChapters = await getChapters(
          token,
          currentClass.id,
          currentSubject.id,
          board,
          needsStream && currentStream ? currentStream.id : defaultStreamId,
          language
        );
        if (Array.isArray(fetchedChapters)) {
          setChapters(fetchedChapters);
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
      }
    };
    fetchChaptersData();
  }, [language, className, subject, stream, needsStream, classes, subjects, streams, token, board]);

  // ── Generate notes ──
  const handleGenerateNotes = async () => {
    if (!selectedChapter) return;
    const streamParam = needsStream && stream ? `&stream=${stream}` : "";
    const res = await fetch(
      `${config.server}/api/v1/ainote?language=${language}&board=${board}&class=${className}&subject=${subject}&topic=${selectedChapter}${streamParam}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();

    setNote(data.data?.[0]);
    setShowNotes(true);
    setPreviewMode(null);
    setShowBookWarning(false);
  };

  // ── Open Full Notes PDF inline ──
  const openFullNotesPdf = () => {
    if (!note?.pdfUrl) return;
    setPreviewMode("notes");
  };

  // ── Open Book PDF inline (guard if notes not generated yet) ──
  const openBookPdf = () => {
    if (!showNotes || !note) {
      setShowBookWarning(true);
      // Auto-dismiss after 4 seconds
      setTimeout(() => setShowBookWarning(false), 4000);
      return;
    }
    if (!note.bookUrl) return;
    setPreviewMode("book");
  };

  const closePreview = () => setPreviewMode(null);

  const isPdfOpen = previewMode !== null;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              AI Notes
            </h1>
            <p className="text-muted-foreground mt-1">Study Guide Generator</p>
          </div>
          <Button variant="outline" onClick={openBookPdf}>
            <BookOpen className="w-4 h-4 mr-2" />
            Request Book
          </Button>
        </div>

        {/* Warning banner — shown when clicking Request Book before generating notes */}
        {showBookWarning && (
          <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Notes not generated yet</p>
              <p className="text-sm mt-0.5">
                Please select your Language, Class, Subject and Chapter, then click{" "}
                <strong>Generate Notes</strong> before accessing the book.
              </p>
            </div>
            <button
              onClick={() => setShowBookWarning(false)}
              className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── PDF Preview: fills the entire content area below the header ── */}
        {isPdfOpen && note && (
          <div className="edtech-card relative flex flex-col" style={{ minHeight: "82vh" }}>
            {/* X close — top-right */}
            <button
              onClick={closePreview}
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors border border-border"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4 pr-10">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {previewMode === "book"
                  ? `${note.topic} — Book`
                  : `${note.topic} — Full Notes`}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">PDF Preview</p>
            </div>

            <iframe
              src={previewMode === "book" ? note.bookUrl : note.pdfUrl}
              title={previewMode === "book" ? "Book PDF" : "Full Notes PDF"}
              className="w-full flex-1 rounded-lg border border-border"
              style={{ height: "calc(82vh - 90px)" }}
            />
          </div>
        )}

        {/* Breadcrumb — hidden when PDF open */}
        {!isPdfOpen && (
          <div className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
            <span>{subject}</span>
            <ChevronRight className="w-4 h-4" />
            <span>CBSE</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">
              {selectedChapter || "Select Chapter"}
            </span>
          </div>
        )}

        {/* Filters — hidden when PDF open */}
        {!isPdfOpen && (
          <div className="edtech-card mb-6">
            <div className="flex flex-wrap gap-3 items-end">

              {/* Language */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Language
                </label>
                <Select
                  value={language}
                  onValueChange={(val) => {
                    setLanguage(val);
                    setClassName("");
                    resetStream();
                    resetNotes();
                    setSelectedChapter(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Class
                </label>

                {profileClass ? (
                  // Student with profile class → static locked display, no dropdown
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                    <span>{profileClassLabel}</span>
                    <span className="ml-auto text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      your grade
                    </span>
                  </div>
                ) : (
                  // Teacher / student without a profile class → full dropdown
                  <Select
                    value={className}
                    onValueChange={(val) => {
                      setClassName(val);
                      resetStream();
                      resetNotes();
                      setSelectedChapter(null);
                    }}
                    disabled={!language}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Stream — only for class 11 & 12 */}
              {needsStream && (
                <div className="flex-1 min-w-[140px]">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Stream
                  </label>
                  <Select
                    value={stream}
                    onValueChange={(val) => {
                      setStream(val);
                      setSubject("");
                      setSubjects([]);
                      setChapters([]);
                      setSelectedChapter(null);
                      resetNotes();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {streams.map((s) => (
                        <SelectItem key={s.id} value={s.stream_name}>
                          {s.stream_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Subject
                </label>
                <Select
                  value={subject}
                  onValueChange={(val) => {
                    setSubject(val);
                    resetNotes();
                    setSelectedChapter(null);
                  }}
                  disabled={needsStream ? !stream : !className}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={needsStream && !stream ? "Select stream first" : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.subject_name}>
                        {s.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chapter */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Chapter
                </label>
                <Select
                  value={selectedChapter || ""}
                  onValueChange={(val) => {
                    setSelectedChapter(val);
                    resetNotes();
                  }}
                  disabled={!subject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subject ? "Select chapter" : "Select subject first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.name}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        )}

        {/* Main content grid — hidden when PDF open */}
        {!isPdfOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chapter list */}
            <div className="edtech-card lg:col-span-1">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chapters..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {chapters
                    .filter((ch) =>
                      ch.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => {
                          setSelectedChapter(chapter.name);
                          resetNotes();
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm transition-colors ${selectedChapter === chapter.name
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                          }`}
                      >
                        <span>{chapter.name}</span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedChapter === chapter.name
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                            }`}
                        />
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Notes / PDF area — right panel */}
            <div className="lg:col-span-2">
              {showNotes && note ? (
                /* ─── Short Notes card ─── */
                <div className="edtech-card">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {note.topic} — CBSE Grade {className} {subject}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      {/* Full Note Preview button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openFullNotesPdf}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Full Note Preview
                      </Button>
                      {/* Download button */}
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={note.pdfUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Rendered short notes — interactive emoji-rich renderer */}
                  <ScrollArea className="h-[520px] pr-2">
                    <div className="space-y-0.5 [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:p-3 [&_.katex-display]:rounded-xl [&_.katex-display]:bg-muted/40 [&_.katex-display]:border [&_.katex-display]:border-border/50">
                      {/* Reset section counters before each render */}
                      {(() => { _sectionIdx = 0; _listItemIdx = 0; _globalItemIdx = 0; return null; })()}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={makeComponents()}
                      >
                        {normaliseNotes(note.short_notes)}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                /* ─── Empty state ─── */
                <div className="edtech-card text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    Generate Study Notes
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Select a chapter and click generate to create comprehensive
                    study notes with key concepts and summaries.
                  </p>
                  <Button
                    onClick={handleGenerateNotes}
                    className="gradient-button"
                    disabled={!selectedChapter}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Notes
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
