import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Upload, FileText, File, X, Sparkles, Download, Copy, Check } from "lucide-react";
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

export default function SummarizerPage() {
  // -----------------------------
  // STATE (NO UI CHANGE)
  // -----------------------------
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  // 🔹 Added language state
  const [language, setLanguage] = useState("English");

  const { token } = useAuth();

  // -----------------------------
  // DRAG & DROP (UNCHANGED)
  // -----------------------------
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  // -----------------------------
  // 🔥 BACKEND INTEGRATION
  // -----------------------------
  const handleSummarize = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      // backend expects these two fields
      formData.append("file", file);
      formData.append("language", language);

      const res = await fetch(`${config.server}/api/summarize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Summarization failed");
      }

      setSummary(data.summary);

      setShowSummary(true);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formatSummary = (text: string) => {
    return text
      .replace(/•/g, "\n• ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // Copy summary to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatSummary(summary));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formatSummary(summary);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Re-summarize with the same file and language
  const handleGenerateAgain = () => {
    if (!file) return;
    handleSummarize();
  };

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
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value)}
              >
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

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
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
                    Supported Formats: Images, PDF, Doc, Docs, PPT, PPTX; Max
                    size: 20MB.
                  </p>

                  <label>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                      onChange={(e) =>
                        setFile(e.target.files?.[0] || null)
                      }
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

            {/* backend error */}
            {error && (
              <p className="text-red-500 text-sm mt-4 text-center">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="edtech-card animate-fade-in">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Document Summary
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generated just now
                </p>
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

            {/* AI SUMMARY */}
            <div className="prose max-w-none prose-headings:font-semibold prose-p:text-muted-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {formatSummary(summary)}
              </ReactMarkdown>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSummary(false);
                  setFile(null);
                  setSummary("");
                }}
              >
                Summarize Another
              </Button>

              <Button
                className="gradient-button"
                onClick={handleGenerateAgain}
                disabled={loading}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? "Generating..." : "Generate Again"}
              </Button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}