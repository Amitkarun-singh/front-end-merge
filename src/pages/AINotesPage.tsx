import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  BookOpen,
  ChevronRight,
  Sparkles,
  Search,
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
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { useAuth } from "@/context/AuthContext";

interface AINote {
  topic: string;
  short_notes: string;
  full_notes: string;
}

export default function AINotesPage() {
  // ===============================
  // BACKEND DATA STATES
  // ===============================
  const [languages, setLanguages] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);

  // ===============================
  // SELECTED VALUES (UI)
  // ===============================
  const [language, setLanguage] = useState("English");
  const [className, setClassName] = useState("10");
  const [subject, setSubject] = useState("Mathematics");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // ===============================
  // NOTES STATE
  // ===============================
  const [note, setNote] = useState<AINote | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const { token } = useAuth();

  // ===============================
  // RESET NOTES (LOGIC ONLY)
  // ===============================
  const resetNotes = () => {
    setShowNotes(false);
    setNote(null);
  };

  // ===============================
  // FETCH LANGUAGES
  // ===============================
  useEffect(() => {
    fetch(`${config.server}/api/ainote/languages`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        })
      .then(res => res.json())
      .then(data => setLanguages(data.data || []));
  }, []);

  // ===============================
  // FETCH CLASSES
  // ===============================
  useEffect(() => {
    fetch(
      `${config.server}/api/ainote/classes?language=${language}&board=CBSE`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(res => res.json())
      .then(data => setClasses(data.data || []));
  }, [language]);

  // ===============================
  // FETCH SUBJECTS
  // ===============================
  useEffect(() => {
    fetch(
      `${config.server}/api/ainote/subjects?language=${language}&class=${className}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then(res => res.json())
      .then(data => setSubjects(data.data || []));
  }, [language, className]);

  // ===============================
  // FETCH CHAPTERS
  // ===============================
  useEffect(() => {
    fetch(
      `${config.server}/api/ainote/chapters?language=${language}&class=${className}&subject=${subject}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then(res => res.json())
      .then(data => setChapters(data.data || []));
  }, [language, className, subject]);

  // ===============================
  // GENERATE NOTES
  // ===============================
  const handleGenerateNotes = async () => {
    if (!selectedChapter) return;

    const res = await fetch(
      `${config.server}/api/ainote?language=${language}&board=CBSE&class=${className}&subject=${subject}&topic=${selectedChapter}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setNote(data.data?.[0]);
    setShowNotes(true);
  };

  const renderLine = (text: string) => {
    if (!text) return null;

    const cleaned = text.replace("-", "").trim();

    // detect inline math \( ... \)
    const inlineMatch = cleaned.match(/\\\((.*?)\\\)/);

    if (inlineMatch) {
      return <InlineMath math={inlineMatch[1]} />;
    }

    // detect block math
    if (cleaned.includes("\\")) {
      const formula = cleaned
        .replace(/\\\[/g, "")
        .replace(/\\\]/g, "")
        .trim();

      return <BlockMath math={formula} />;
    }

    return <span>{cleaned}</span>;
  };

  const openFullNotes = () => {
    if (!note?.full_notes) return;

    window.open(note.full_notes, "_blank");
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
            <p className="text-muted-foreground mt-1">
              Study Guide Generator
            </p>
          </div>
          <Button variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Request Book
          </Button>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <span>Mathematics</span>
          <ChevronRight className="w-4 h-4" />
          <span>Default</span>
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
                  {languages.map(l => (
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
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
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
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
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
                  {chapters.map(chapter => (
                    <SelectItem key={chapter} value={chapter}>
                      {chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chapters list */}
          <div className="edtech-card lg:col-span-1">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search" className="pl-10" />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {chapters.map((chapter) => (
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
                      className={`w-4 h-4 rounded-full border-2 ${
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

          {/* Notes content */}
          <div className="lg:col-span-2">
            {showNotes && note ? (
              /* ===== ORIGINAL NOTES UI (UNCHANGED) ===== */
              <div className="edtech-card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      {note.topic} - CBSE Class {className} {subject}
                    </h2>
                    {/* <p className="text-sm text-muted-foreground mt-1">
                      6 marks info
                    </p> */}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openFullNotes}>
                      <FileText className="w-4 h-4 mr-2" />
                      Full Note Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* <div className="prose prose-sm max-w-none">
                  <h3>Study Guide: {note.topic}</h3>
                  <p>{note.short_notes}</p>

                  <h4>Detailed Notes</h4>
                  <p>{note.full_notes}</p>
                </div> */}
                <div className="space-y-6 text-sm leading-relaxed">
                  {note.short_notes
                    .replace(/\\n/g, "\n")
                    .replace(/^\)\s*/, "")
                    .replace(/---.*/g, "")
                    .split(/\n(?=\d+\.\s)/)
                    .map((section, index) => {
                      const lines = section.split("\n");
                      const title = lines[0];
                      const content = lines.slice(1);

                      return (
                        <div key={index}>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {title}
                          </h3>

                          <div className="space-y-2 text-muted-foreground">
                            {content.map((line, i) => {
                              if (line.trim().startsWith("-")) {
                                return (
                                  <div key={i} className="flex gap-2">
                                    <span>•</span>
                                    {renderLine(line)}
                                  </div>
                                );
                              }

                              return (
                                <p key={i}>
                                  {line.trim()}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* ===== ORIGINAL EMPTY STATE UI (UNCHANGED) ===== */
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
