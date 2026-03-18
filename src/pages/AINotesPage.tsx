import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  BookOpen,
  ChevronRight,
  Sparkles,
  Search,
  X,
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
import { InlineMath, BlockMath } from "react-katex";
import { useAuth } from "@/context/AuthContext";

interface AINote {
  topic: string;
  short_notes: string;
  full_notes: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers to parse and render the short_notes markdown-like text
// ─────────────────────────────────────────────────────────────

/** Render a single text segment that may contain inline LaTeX \( … \) */
const renderInlineText = (text: string, key?: number) => {
  // Split on \( ... \) inline math (non-greedy, single-line)
  const parts = text.split(/(\\\([\s\S]*?\\\))/g);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        const match = part.match(/^\\\([\s\S]*?\\\)$/);
        if (match) {
          // Strip \displaystyle so KaTeX renders it as inline
          const formula = part
            .replace(/^\\\(/, "")
            .replace(/\\\)$/, "")
            .replace(/\\displaystyle\s*/g, "")
            .trim();
          try {
            return <InlineMath key={i} math={formula} />;
          } catch {
            return <span key={i}>{formula}</span>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

/**
 * Split a table row string by "|", but only when the "|" is NOT inside \( … \).
 * This avoids breaking LaTeX formulas that happen to contain a pipe char.
 */
const splitTableCells = (row: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let depth = 0; // >0 means we are inside \( … \)
  let i = 0;
  while (i < row.length) {
    // Detect opening \(
    if (row[i] === "\\" && row[i + 1] === "(") {
      depth++;
      current += "\\(";
      i += 2;
      continue;
    }
    // Detect closing \)
    if (row[i] === "\\" && row[i + 1] === ")") {
      depth = Math.max(0, depth - 1);
      current += "\\)";
      i += 2;
      continue;
    }
    // Split on | only when not inside math
    if (row[i] === "|" && depth === 0) {
      cells.push(current);
      current = "";
      i++;
      continue;
    }
    current += row[i];
    i++;
  }
  cells.push(current);
  return cells;
};

/** Render a single line considering bullet, heading, math, or plain text */
const renderLine = (line: string, idx: number) => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // ### Heading line
  if (trimmed.startsWith("### ")) {
    const headingText = trimmed.replace(/^###\s+/, "");
    return (
      <h3
        key={idx}
        className="text-lg font-bold text-foreground mt-6 mb-2 border-b border-border pb-1"
      >
        {headingText}
      </h3>
    );
  }

  // ## Heading
  if (trimmed.startsWith("## ")) {
    return (
      <h2 key={idx} className="text-xl font-bold text-foreground mt-6 mb-3">
        {trimmed.replace(/^##\s+/, "")}
      </h2>
    );
  }

  // # Heading
  if (trimmed.startsWith("# ")) {
    return (
      <h1 key={idx} className="text-2xl font-bold text-foreground mt-6 mb-3">
        {trimmed.replace(/^#\s+/, "")}
      </h1>
    );
  }

  // Numbered heading like "1. Introduction" at start of line (no ### prefix)
  if (/^\d+\.\s+[A-Z]/.test(trimmed) && !trimmed.includes("|")) {
    return (
      <h3
        key={idx}
        className="text-lg font-bold text-foreground mt-6 mb-2 border-b border-border pb-1"
      >
        {trimmed}
      </h3>
    );
  }

  // Block math \[ … \]
  const blockMatchBracket = trimmed.match(/^\\\[([\s\S]*?)\\\]$/);
  if (blockMatchBracket) {
    return (
      <div key={idx} className="my-3">
        <BlockMath math={blockMatchBracket[1].trim()} />
      </div>
    );
  }

  // A line that starts with LaTeX block commands (no bullet prefix)
  if (
    trimmed.startsWith("\\") &&
    !trimmed.startsWith("\\(") &&
    !trimmed.startsWith("• ") &&
    !trimmed.startsWith("•")
  ) {
    try {
      return (
        <div key={idx} className="my-3">
          <BlockMath math={trimmed.replace(/^\\text\{.*?\}\s*/, "")} />
        </div>
      );
    } catch {
      // fall through to plain text
    }
  }

  // Bullet / sub-bullet — detect indentation from the ORIGINAL line
  if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
    const content = trimmed.replace(/^[•\-\*]\s*/, "");
    const leadingSpaces = line.match(/^(\s+)/)?.[1]?.length ?? 0;
    const isSubBullet = leadingSpaces >= 2;
    return (
      <div
        key={idx}
        className={`flex gap-2 py-0.5 ${isSubBullet ? "ml-6" : ""}`}
      >
        <span
          className={`mt-0.5 flex-shrink-0 text-sm ${
            isSubBullet ? "text-muted-foreground/50" : "text-primary"
          }`}
        >
          {isSubBullet ? "◦" : "•"}
        </span>
        <span className="text-muted-foreground">{renderInlineText(content)}</span>
      </div>
    );
  }

  // Table row — handled by table parser
  if (trimmed.startsWith("|")) {
    return null;
  }

  // Plain text / paragraph
  return (
    <p key={idx} className="text-muted-foreground leading-relaxed">
      {renderInlineText(trimmed)}
    </p>
  );
};

/** Full parser: collapses table rows and renders everything else line-by-line */
const parseShortNotes = (raw: string) => {
  // Normalize escaped newlines
  const normalised = raw
    .replace(/\\n/g, "\n")
    .replace(/^\)\s*/, "")
    .replace(/---.*$/gm, "");

  const lines = normalised.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection: collect consecutive | lines
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse table - use math-aware cell splitter
      const rows = tableLines
        .filter((l) => !/^\|[\s\-|]+\|$/.test(l.trim())) // skip separator rows
        .map((l) => {
          const inner = l.trim().replace(/^\|/, "").replace(/\|$/, "");
          return splitTableCells(inner).map((cell) => cell.trim());
        });

      if (rows.length > 0) {
        const [header, ...body] = rows;
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary/10">
                  {header.map((h, hi) => (
                    <th
                      key={hi}
                      className="text-left p-3 font-semibold text-foreground border border-border"
                    >
                      {renderInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-muted/30" : ""}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="p-3 text-muted-foreground border border-border"
                      >
                        {renderInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    const rendered = renderLine(line, i);
    if (rendered !== null) {
      elements.push(rendered);
    }
    i++;
  }

  return elements;
};

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────

export default function AINotesPage() {
  const [languages, setLanguages] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);

  const [language, setLanguage] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const [note, setNote] = useState<AINote | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // PDF preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const { token } = useAuth();

  const resetNotes = () => {
    setShowNotes(false);
    setNote(null);
    setShowPdfPreview(false);
  };

  // ── Fetch languages ──
  useEffect(() => {
    fetch(`${config.server}/api/ainote/languages`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setLanguages(data.data || []));
  }, []);

  // ── Fetch classes (requires language) ──
  useEffect(() => {
    if (!language) { setClasses([]); return; }
    fetch(`${config.server}/api/ainote/classes?language=${language}&board=CBSE`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setClasses(data.data || []));
  }, [language]);

  // ── Fetch subjects (requires language + class) ──
  useEffect(() => {
    if (!language || !className) { setSubjects([]); return; }
    fetch(
      `${config.server}/api/ainote/subjects?language=${language}&class=${className}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    )
      .then((res) => res.json())
      .then((data) => setSubjects(data.data || []));
  }, [language, className]);

  // ── Fetch chapters (requires language + class + subject) ──
  useEffect(() => {
    if (!language || !className || !subject) { setChapters([]); return; }
    fetch(
      `${config.server}/api/ainote/chapters?language=${language}&class=${className}&subject=${subject}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    )
      .then((res) => res.json())
      .then((data) => setChapters(data.data || []));
  }, [language, className, subject]);

  // ── Generate notes ──
  const handleGenerateNotes = async () => {
    if (!selectedChapter) return;
    const res = await fetch(
      `${config.server}/api/ainote?language=${language}&board=CBSE&class=${className}&subject=${subject}&topic=${selectedChapter}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    console.log(data);
    setNote(data.data?.[0]);
    setShowNotes(true);
    setShowPdfPreview(false);
  };

  // ── Open Full Notes as inline PDF ──
  const openFullNotes = () => {
    if (!note?.full_notes) return;
    setShowPdfPreview(true);
  };

  const closePdfPreview = () => {
    setShowPdfPreview(false);
  };

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
          <Button variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Request Book
          </Button>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <span>{subject}</span>
          <ChevronRight className="w-4 h-4" />
          <span>CBSE</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">
            {selectedChapter || "Select Chapter"}
          </span>
        </div>

        {/* Filters */}
        <div className="edtech-card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Language */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Language
              </label>
              <Select
                value={language}
                onValueChange={(val) => {
                  setLanguage(val);
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
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Class
              </label>
              <Select
                value={className}
                onValueChange={(val) => {
                  setClassName(val);
                  resetNotes();
                  setSelectedChapter(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
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
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chapter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Chapter
              </label>
              <Select
                value={selectedChapter || ""}
                onValueChange={(val) => {
                  setSelectedChapter(val);
                  resetNotes();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter} value={chapter}>
                      {chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Full-width PDF Viewer ── renders outside grid to span full content width */}
        {showNotes && note && showPdfPreview && (
          <div className="edtech-card relative mb-6">
            {/* Close button */}
            <button
              onClick={closePdfPreview}
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors border border-border"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4 pr-10">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {note.topic} — Full Notes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">PDF Preview</p>
            </div>

            <iframe
              src={note.full_notes}
              title="Full Notes PDF"
              className="w-full rounded-lg border border-border"
              style={{ height: "75vh" }}
            />
          </div>
        )}

        {/* Main content grid — hidden while PDF is open */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${
          showNotes && note && showPdfPreview ? "hidden" : ""
        }`}>
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
                    ch.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((chapter) => (
                  <button
                    key={chapter}
                    onClick={() => {
                      setSelectedChapter(chapter);
                      resetNotes();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm transition-colors ${
                      selectedChapter === chapter
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{chapter}</span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        selectedChapter === chapter
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Notes / PDF preview area */}
          <div className="lg:col-span-2">
            {showNotes && note ? (

                /* ─── Short Notes ─── */
                <div className="edtech-card">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {note.topic} — CBSE Class {className} {subject}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openFullNotes}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Full Note Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={note.full_notes}
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

                  {/* Rendered short notes */}
                  <ScrollArea className="h-[520px] pr-2">
                    <div className="space-y-1 text-sm leading-relaxed">
                      {parseShortNotes(note.short_notes)}
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
      </div>
    </div>
  );
}
