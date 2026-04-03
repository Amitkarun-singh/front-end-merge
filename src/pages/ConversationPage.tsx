import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  FileText,
  GraduationCap,
  ClipboardList,
  FileSearch,
  Grid3X3,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchConversation,
  Conversation,
  ConversationMessage,
} from "@/api/historyApi";
import { Badge } from "@/components/ui/badge";
import schools2aiIcon from "@/assets/schools2ai-icon.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";



// ─── Tool → icon map ──────────────────────────────────────────────────────────
const toolIconMap: Record<string, React.ElementType> = {
  "ai gini":        MessageCircle,
  "ai notes":       FileText,
  "ai tutor":       GraduationCap,
  "ai practice":    ClipboardList,
  "doc summariser": FileSearch,
  "more tools":     Grid3X3,
};

function getToolIcon(tool: string): React.ElementType {
  const lower = (tool || "").toLowerCase();
  for (const [key, Icon] of Object.entries(toolIconMap)) {
    if (lower.includes(key)) return Icon;
  }
  return MessageCircle;
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────
function formatTime(raw: string | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Preprocess LaTeX ─────────────────────────────────────────────────────────
function preprocessLatex(content: string): string {
  return content
    .replace(/\\\(/g, "$").replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$").replace(/\\\]/g, "$$");
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({
  message,
  toolIcon: ToolIcon,
}: {
  message: ConversationMessage;
  toolIcon: React.ElementType;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end group">
        <div className="flex flex-col items-end gap-1 max-w-[80%] lg:max-w-[65%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>
        {/* User avatar */}
        <div className="ml-2 flex-shrink-0 self-end">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // AI bubble — render full Markdown + LaTeX
  return (
    <div className="flex justify-start group">
      {/* AI avatar */}
      <div className="mr-2 flex-shrink-0 self-end">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shadow-sm">
          <img src={schools2aiIcon} alt="AI" className="w-5 h-5 object-contain" />
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 max-w-[80%] lg:max-w-[70%]">
        <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ node, ...props }) => (
                  <p {...props} className="mb-1.5 last:mb-0 text-sm text-foreground" />
                ),
                h1: ({ node, ...props }) => <h1 {...props} className="text-base font-bold mb-1 mt-2 first:mt-0" />,
                h2: ({ node, ...props }) => <h2 {...props} className="text-sm font-bold mb-1 mt-2 first:mt-0" />,
                h3: ({ node, ...props }) => <h3 {...props} className="text-sm font-semibold mb-1 mt-2 first:mt-0" />,
                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 my-1 space-y-0.5" />,
                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 my-1 space-y-0.5" />,
                li: ({ node, ...props }) => <li {...props} className="text-sm text-foreground" />,
                strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-foreground" />,
                code: ({ node, className, children, ...props }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <code {...props} className="block bg-muted rounded-md px-3 py-2 text-xs font-mono my-2 overflow-x-auto">{children}</code>
                  ) : (
                    <code {...props} className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                  );
                },
              }}
            >
              {preprocessLatex(message.content)}
            </ReactMarkdown>
          </div>
        </div>
        {message.timestamp && (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ConversationPage() {
  const { conversation_id } = useParams<{ conversation_id: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source") ?? undefined;
  const navigate = useNavigate();
  const { token } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !conversation_id) return;

    setLoading(true);
    setError(null);

    fetchConversation(token, conversation_id, source)
      .then((data) => {
        setConversation(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, conversation_id, source]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (!loading && conversation?.messages.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, conversation]);

  const ToolIcon = conversation ? getToolIcon(conversation.tool) : Bot;

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <ToolIcon className="w-4 h-4 text-primary-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate text-sm">
            {loading ? "Loading…" : (conversation?.title || "Conversation")}
          </p>
          {conversation && (
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs py-0 h-4">
                {conversation.tool}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {conversation.turn_count ?? conversation.messages.length} turn{(conversation.turn_count ?? conversation.messages.length) !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading conversation…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Failed to load conversation</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Go back
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && conversation && conversation.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <p className="text-sm">No messages in this conversation.</p>
            </div>
          )}

          {/* Messages */}
          {!loading && !error && conversation && conversation.messages.length > 0 && (
            <div className="space-y-4">
              {/* Date divider */}
              {conversation.created_at && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(conversation.created_at).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {conversation.messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} toolIcon={ToolIcon} />
              ))}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
