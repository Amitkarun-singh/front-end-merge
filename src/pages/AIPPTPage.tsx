import { useState, useEffect } from "react";
import {
  Presentation,
  ExternalLink,
  Download,
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
import { useAuth } from "@/context/AuthContext";
import { getClasses, getStreams, getSubjects, getChapters } from "@/api/curriculum";
import type { Class, Stream, Subject, Chapter } from "@/api/curriculum";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AIPpt {
  id: number;
  language: string;
  board: string;
  stream: number | null;
  class: number;
  subject: number;
  chapter_id: number;
  topic: string;
  ppt: string;
  created_by: string;
  created_at: string;
  pptUrl: string | null;
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function AIPPTPage() {
  // ── Dropdown data ────────────────────────────────────────────
  const [languages, setLanguages] = useState<string[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // ── Selected filters ─────────────────────────────────────────
  const [language, setLanguage] = useState("");
  const [className, setClassName] = useState("");
  const [stream, setStream] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // ── PPT data ─────────────────────────────────────────────────
  // chapter_id → AIPpt mapping (only chapters that have a PPT)
  const [pptMap, setPptMap] = useState<Record<number, AIPpt>>({});
  // Set of chapter ids that have a PPT (used to filter the chapter list)
  const [pptChapterIds, setPptChapterIds] = useState<Set<number>>(new Set());
  // Set of subject ids that have at least one PPT (null = not yet fetched; Set = API responded)
  const [pptSubjectIds, setPptSubjectIds] = useState<Set<number> | null>(null);

  // ── Selected PPT & PDF preview state ─────────────────────────
  const [selectedPpt, setSelectedPpt] = useState<AIPpt | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  // ── Search ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Loading / error ──────────────────────────────────────────
  const [pptLoading, setPptLoading] = useState(false);
  const [pptError, setPptError] = useState(false);

  const { token, user } = useAuth();

  // ── Auth / profile ───────────────────────────────────────────
  const rawRole =
    typeof user?.role === "string"
      ? user.role
      : (user?.role as Record<string, unknown>)?.name as string | undefined;
  const isStudent = rawRole?.toLowerCase() === "student";

  const rawProfileClass = user?.class_name
    ? String(user.class_name).replace(/^grade\s*/i, "").trim()
    : user?.class
    ? String(user.class).replace(/^grade\s*/i, "").trim()
    : null;
  const profileClass = isStudent && rawProfileClass ? rawProfileClass : null;
  const profileClassLabel = profileClass ? `Grade ${profileClass}` : null;

  const board = (user?.board as string) || "CBSE";

  // ── Derived ──────────────────────────────────────────────────
  const needsStream = className === "11" || className === "12";

  // ─────────────────────────────────────────────────────────────
  // Reset helpers (mirror AINotesPage)
  // ─────────────────────────────────────────────────────────────
  const resetPpt = () => {
    setSelectedPpt(null);
    setPdfOpen(false);
    setPptMap({});
    setPptChapterIds(new Set());
  };

  const resetStream = () => {
    setStream("");
    setSubjects([]);
    setChapters([]);
    setSubject("");
    setSelectedChapter(null);
    setPptSubjectIds(null);
    resetPpt();
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Languages — from /api/v1/aippt/languages
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${config.server}/api/v1/aippt/languages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: string[] = Array.isArray(data?.data) ? data.data : [];
        setLanguages(list);
        // Auto-select English if available and no language chosen yet
        if (!language) {
          const english = list.find((l) => l.toLowerCase() === "english");
          if (english) setLanguage(english);
        }
      })
      .catch(() => {});
  }, [token]);

  // ─────────────────────────────────────────────────────────────
  // 2. Classes — requires language (same as AINotesPage)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!language) { setClasses([]); return; }

    if (profileClass) {
      getClasses(token, "ai-ppt")
        .then((data) => {
          if (Array.isArray(data)) {
            setClasses(data);
            setClassName(profileClass);
          }
        })
        .catch(() => {});
      return;
    }

    getClasses(token, "ai-ppt")
      .then((data) => {
        if (Array.isArray(data)) setClasses(data);
      })
      .catch(() => {});
  }, [language, token, profileClass]);

  // ─────────────────────────────────────────────────────────────
  // 3. Streams — only for class 11 & 12
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!needsStream || !language) { setStreams([]); setStream(""); return; }

    getStreams(token)
      .then((data) => {
        if (Array.isArray(data)) { setStreams(data); setStream(""); }
      })
      .catch(() => {});
  }, [needsStream, language, token]);

  // ─────────────────────────────────────────────────────────────
  // 4. Subjects — requires language + class (+ stream for 11/12)
  // ─────────────────────────────────────────────────────────────
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

    getSubjects(
      token,
      currentClass.id,
      board,
      needsStream && currentStream ? currentStream.id : defaultStreamId,
      language
    )
      .then((data) => { if (Array.isArray(data)) setSubjects(data); })
      .catch(() => {});
  }, [language, className, stream, needsStream, classes, streams, token, board]);

  // ─────────────────────────────────────────────────────────────
  // 4b. PPT Subjects — derive subject IDs that have ≥1 PPT row
  //     Uses the existing GET /api/v1/aippt (no subject filter)
  //     to avoid needing a separate /subjects endpoint.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!language || !className || !token) { setPptSubjectIds(null); return; }
    if (needsStream && !stream) { setPptSubjectIds(null); return; }

    const currentClass = classes.find((c) => c.slug === className);
    if (!currentClass) return;

    const generalStream = streams.find(
      (s) => s.stream_name.toLowerCase() === "general" || s.slug === "general"
    );
    const defaultStreamId = generalStream ? generalStream.id : 4;
    const currentStream = streams.find((s) => s.stream_name === stream);
    const streamId = needsStream && currentStream ? currentStream.id : defaultStreamId;

    const params = new URLSearchParams({
      language,
      board,
      class: String(currentClass.id),
      stream: String(streamId),
    });

    // Fetch all PPTs for this class (no subject filter) and extract distinct subject IDs
    fetch(`${config.server}/api/v1/aippt?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: AIPpt[] = Array.isArray(data?.data) ? data.data : [];
        const ids = new Set<number>(list.map((p) => p.subject).filter(Boolean));
        setPptSubjectIds(ids);
      })
      .catch(() => {
        // On network error fall back to showing all subjects
        setPptSubjectIds(null);
      });
  }, [language, className, stream, needsStream, classes, streams, token, board]);

  // ─────────────────────────────────────────────────────────────
  // 5. Chapters — requires language + class + subject (+ stream)
  // ─────────────────────────────────────────────────────────────
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

    getChapters(
      token,
      currentClass.id,
      currentSubject.id,
      board,
      needsStream && currentStream ? currentStream.id : defaultStreamId,
      language
    )
      .then((data) => { if (Array.isArray(data)) setChapters(data); })
      .catch(() => {});
  }, [
    language, className, subject, stream,
    needsStream, classes, subjects, streams, token, board,
  ]);

  // ─────────────────────────────────────────────────────────────
  // 6. Fetch PPTs for the current filters — build chapter_id → PPT map
  //    Only chapters that have a PPT will be shown in the left panel
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!language || !className || !subject || !token) {
      resetPpt();
      return;
    }
    if (needsStream && !stream) { resetPpt(); return; }

    const currentClass = classes.find((c) => c.slug === className);
    const currentStream = streams.find((s) => s.stream_name === stream);
    const currentSubject = subjects.find((s) => s.subject_name === subject);
    if (!currentClass || !currentSubject) return;

    setPptLoading(true);
    setPptError(false);

    const params = new URLSearchParams({
      language,
      board,
      class: String(currentClass.id),
      subject: String(currentSubject.id),
    });
    if (needsStream && currentStream) params.set("stream", String(currentStream.id));

    fetch(`${config.server}/api/v1/aippt?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: AIPpt[] = Array.isArray(data?.data) ? data.data : [];
        const map: Record<number, AIPpt> = {};
        const ids = new Set<number>();
        for (const ppt of list) {
          if (ppt.chapter_id) {
            map[ppt.chapter_id] = ppt;
            ids.add(ppt.chapter_id);
          }
        }
        setPptMap(map);
        setPptChapterIds(ids);
        setPptLoading(false);
      })
      .catch(() => {
        setPptLoading(false);
        setPptError(true);
      });
  }, [language, className, stream, subject, needsStream, classes, streams, subjects, token, board]);

  // ─────────────────────────────────────────────────────────────
  // Derived: chapters filtered to those that have a PPT
  // ─────────────────────────────────────────────────────────────
  const pptChapters = chapters.filter((ch) => pptChapterIds.has(ch.id));
  const filteredChapters = pptChapters.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived: subjects filtered to those that have ≥1 PPT.
  // - null  → API not yet responded (or reset) → show all subjects (loading state)
  // - Set   → API responded → filter strictly; empty Set means no subjects have PPTs
  const pptSubjects = pptSubjectIds === null
    ? subjects
    : subjects.filter((s) => pptSubjectIds.has(s.id));

  // When a chapter is selected, look up the PPT
  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter.name);
    const ppt = pptMap[chapter.id] || null;
    setSelectedPpt(ppt);
    setPdfOpen(false);
  };

  const closePdf = () => setPdfOpen(false);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              AI PPT Library
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Browse AI-generated presentations for your curriculum
            </p>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-gradient-to-r from-blue-50 to-indigo-50
                       dark:from-blue-950/30 dark:to-indigo-950/30
                       border border-blue-200/60 dark:border-blue-800/40
                       text-indigo-600 dark:text-indigo-400 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Powered by AI
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────── */}
        {pptError && (
          <div
            className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-red-300/50
                       bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300
                       animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-semibold">Failed to load presentations. Please try again.</p>
          </div>
        )}

        {/* ── PDF Preview — fills the content area (same as AINotesPage) ── */}
        {pdfOpen && selectedPpt?.pptUrl && (
          <div className="edtech-card relative flex flex-col" style={{ minHeight: "82vh" }}>
            {/* Close button */}
            <button
              onClick={closePdf}
              className="absolute top-3 right-3 z-10 flex items-center justify-center
                         w-8 h-8 rounded-full bg-muted hover:bg-destructive/10
                         hover:text-destructive transition-colors border border-border"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4 pr-10">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {selectedPpt.topic}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">PDF Preview</p>
            </div>

            <iframe
              src={selectedPpt.pptUrl}
              title={selectedPpt.topic}
              className="w-full flex-1 rounded-lg border border-border"
              style={{ height: "calc(82vh - 90px)" }}
            />
          </div>
        )}

        {/* ── Filters — hidden when PDF open (same as AINotesPage) ── */}
        {!pdfOpen && (
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
                    resetPpt();
                    setSelectedChapter(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
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
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                    <span>{profileClassLabel}</span>
                    <span className="ml-auto text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      your grade
                    </span>
                  </div>
                ) : (
                  <Select
                    value={className}
                    onValueChange={(val) => {
                      setClassName(val);
                      resetStream();
                      resetPpt();
                      setSelectedChapter(null);
                    }}
                    disabled={!language}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>{c.class_name}</SelectItem>
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
                      resetPpt();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {streams.map((s) => (
                        <SelectItem key={s.id} value={s.stream_name}>{s.stream_name}</SelectItem>
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
                    setSelectedChapter(null);
                    resetPpt();
                  }}
                  disabled={needsStream ? !stream : !className}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        needsStream && !stream
                          ? "Select stream first"
                          : !className
                          ? "Select class first"
                          : "Select subject"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pptSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.subject_name}>{s.subject_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        )}

        {/* ── Main content grid — hidden when PDF open (same as AINotesPage) ── */}
        {!pdfOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Chapter list (only chapters that have PPTs) ── */}
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
                {/* Loading shimmer */}
                {pptLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                )}

                {/* Empty state — no chapters with PPTs */}
                {!pptLoading && subject && filteredChapters.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Presentation className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    {chapters.length === 0
                      ? "Select all filters to see available chapters."
                      : "No presentations available for this selection."}
                  </div>
                )}

                {/* Empty state — no subject selected yet */}
                {!pptLoading && !subject && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Presentation className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    Select language, class and subject to browse chapters.
                  </div>
                )}

                {/* Chapter list */}
                {!pptLoading && filteredChapters.length > 0 && (
                  <div className="space-y-1">
                    {filteredChapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => handleSelectChapter(chapter)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm transition-colors
                          ${selectedChapter === chapter.name
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                          }`}
                      >
                        <span>{chapter.name}</span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            selectedChapter === chapter.name
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* ── Right: PPT detail / empty state ── */}
            <div className="lg:col-span-2">
              {selectedPpt ? (
                <div className="edtech-card">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {selectedPpt.topic}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        CBSE Grade {className} &middot; {subject} &middot; {language}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Open PDF inline — same as AINotesPage "Full Note Preview" */}
                      {selectedPpt.pptUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPdfOpen(true)}
                        >
                          <Presentation className="w-4 h-4 mr-2" />
                          Open PDF
                        </Button>
                      )}
                      {/* Download / open in new tab */}
                      {selectedPpt.pptUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={selectedPpt.pptUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* PPT info card */}
                  <div
                    className="flex flex-col items-center text-center py-10 gap-4
                               rounded-xl border border-dashed border-border bg-accent/30"
                  >
                    <div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center
                                 bg-gradient-to-br from-blue-50 to-indigo-100
                                 dark:from-blue-950/40 dark:to-indigo-900/30
                                 border-2 border-blue-200/50 dark:border-blue-800/30 shadow-md"
                    >
                      <Presentation className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
                    </div>

                    <div>
                      <p className="font-semibold text-foreground text-lg">{selectedPpt.topic}</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        {subject} &middot; {board} &middot; {language}
                      </p>
                    </div>

                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                                 bg-indigo-100 text-indigo-700
                                 dark:bg-indigo-900/40 dark:text-indigo-300
                                 uppercase tracking-wide"
                    >
                      {selectedPpt.created_by}
                    </span>

                    {selectedPpt.pptUrl ? (
                      <Button
                        className="gradient-button mt-2"
                        onClick={() => setPdfOpen(true)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Presentation PDF
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        PDF not available for this presentation.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Empty state ── */
                <div className="edtech-card text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
                    <Presentation className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    Select a Chapter
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                    Choose a chapter from the list on the left to view its AI-generated presentation.
                  </p>
                  <Button
                    className="gradient-button"
                    disabled={!selectedChapter}
                    onClick={() => {
                      const ch = pptChapters.find((c) => c.name === selectedChapter);
                      if (ch) handleSelectChapter(ch);
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    View Presentation
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
