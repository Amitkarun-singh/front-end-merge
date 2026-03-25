import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Upload,
  FileText,
  File,
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { config } from "../../app.config.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const MAX_LENGTH_OPTIONS = [
  { label: "Default (Auto)", value: "__auto__" },
  { label: "50 words",       value: "50" },
  { label: "100 words",      value: "100" },
  { label: "250 words",      value: "250" },
  { label: "500 words",      value: "500" },
  { label: "1000 words",     value: "1000" },
];

interface MaxLengthSelectProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

// Defined at module scope — NOT inside the parent component — to avoid
// React re-creating it on every render which crashes Radix UI Select.
const MaxLengthSelect = ({ value, onChange, disabled }: MaxLengthSelectProps) => (
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-foreground whitespace-nowrap">
      Max Words
    </label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Default (Auto)" />
      </SelectTrigger>
      <SelectContent>
        {MAX_LENGTH_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default function SummarizerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState("English");
  const [maxLength, setMaxLength] = useState<string>("__auto__"); // "__auto__" = not sent to backend
  const maxLengthRef = useRef<string>("__auto__"); // always holds the latest value immediately

  // Sync both state (for UI) and ref (for handleSummarize closure) on change
  const handleMaxLengthChange = (val: string) => {
    setMaxLength(val);
    maxLengthRef.current = val;
  };

  // Feedback state: null = not given, "like" | "dislike" = given
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const { token } = useAuth();

  // ── Drag & drop ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  // ── Send summary to backend ──
  const handleSummarize = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setFeedback(null);
    setFeedbackSent(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      // Read from ref — guaranteed to have the latest value regardless of render batching
      const currentMaxLength = maxLengthRef.current;
      const wordLimit = currentMaxLength && currentMaxLength !== "__auto__" ? currentMaxLength : null;
      console.log("[Summarizer] maxlength to send:", wordLimit ?? "(none — auto)");
      if (wordLimit) {
        formData.append("maxlenght", wordLimit);  // matches backend typo
        formData.append("maxlength", wordLimit);  // correct spelling fallback
      }

      const res = await fetch(`${config.server}/api/summarize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Summarization failed");

      setSummary(data.summary);
      setShowSummary(true);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Send feedback (like / dislike) to backend ──
  const handleFeedback = async (type: "like" | "dislike") => {
    if (feedbackSent) return;
    setFeedback(type);
    setFeedbackSent(true);

    try {
      await fetch(`${config.server}/api/summarize/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback: type }),
      });
    } catch {
      // silently fail — feedback is best-effort
    }
  };

  const formatSummary = (text: string) =>
    text.replace(/•/g, "\n• ").replace(/\n{3,}/g, "\n\n").trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatSummary(summary));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = formatSummary(summary);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // (MaxLengthSelect is defined at module scope above)

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            AI PDF Summarizer
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Upload any PDF or image and in &lt;30 seconds, get full, easy-to-read
            notes that actually help you understand faster and study smarter.
          </p>
        </div>

        {/* Upload Area */}
        {!showSummary ? (
          <div className="edtech-card">
            <div className="flex items-center justify-between mb-6">
              <Button variant="default" className="gradient-button">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>

              {/* Language Select */}
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                file
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <File className="w-8 h-8 text-primary" />
                  </div>

                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* ── Max Words selector — shown after file is selected ── */}
                  <div className="w-full max-w-xs">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        How many words do you want in the summary?
                      </p>
                  <MaxLengthSelect value={maxLength} onChange={handleMaxLengthChange} />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                    <Button
                      className="gradient-button"
                      onClick={handleSummarize}
                      disabled={loading}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {loading ? "Summarizing..." : "Summarize"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-edtech-pink via-edtech-lavender to-edtech-cyan flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="w-6 h-6 rounded bg-green-400" />
                      <div className="w-6 h-6 rounded bg-blue-400" />
                      <div className="w-6 h-6 rounded bg-red-400" />
                      <div className="w-6 h-6 rounded bg-yellow-400" />
                    </div>
                  </div>

                  <p className="text-foreground font-medium mb-2">
                    Drag and drop your file here to get instant study notes.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supported Formats: Images, PDF, Doc, Docs, PPT, PPTX; Max size: 20MB.
                  </p>

                  <label>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <Button asChild className="gradient-button cursor-pointer">
                      <span>
                        <FileText className="w-4 h-4 mr-2" />
                        Select file
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
            )}
          </div>
        ) : (
          <div className="edtech-card animate-fade-in">

            {/* Summary header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Document Summary
                </h2>
                <p className="text-sm text-muted-foreground">Generated just now</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>

                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* AI Summary */}
            <div className="prose max-w-none prose-headings:font-semibold prose-p:text-muted-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {formatSummary(summary)}
              </ReactMarkdown>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border space-y-4">

              {/* ── Re-generate row: Max Words + Generate Again ── */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <MaxLengthSelect value={maxLength} onChange={handleMaxLengthChange} disabled={loading} />

                <Button
                  className="gradient-button"
                  onClick={handleSummarize}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Generating..." : "Generate Again"}
                </Button>
              </div>

              {/* ── Feedback + Summarize Another ── */}
              <div className="flex items-center justify-between flex-wrap gap-4">

                {/* 👍 / 👎 Feedback */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {feedbackSent
                      ? feedback === "like"
                        ? "Thanks for the feedback! 🎉"
                        : "Thanks, we'll improve! 🙏"
                      : "Was this summary helpful?"}
                  </span>
                  {!feedbackSent && (
                    <>
                      <button
                        onClick={() => handleFeedback("like")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                          ${feedback === "like"
                            ? "bg-green-500/10 border-green-500 text-green-600"
                            : "border-border hover:border-green-500 hover:text-green-600 text-muted-foreground"
                          }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Yes
                      </button>
                      <button
                        onClick={() => handleFeedback("dislike")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                          ${feedback === "dislike"
                            ? "bg-red-500/10 border-red-500 text-red-600"
                            : "border-border hover:border-red-500 hover:text-red-600 text-muted-foreground"
                          }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        No
                      </button>
                    </>
                  )}
                </div>

                {/* Summarize Another */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSummary(false);
                    setFile(null);
                    setSummary("");
                    setFeedback(null);
                    setFeedbackSent(false);
                    handleMaxLengthChange("__auto__");
                  }}
                >
                  Summarize Another
                </Button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}