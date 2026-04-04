import {
  Home as HomeIcon,
  FileText,
  GraduationCap,
  ClipboardList,
  Sparkles,
  Upload,
  Globe,
  MonitorSmartphone,
  ArrowRight,
  Send,
  RotateCcw,
  Paperclip,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Plus,
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
import { QuickTool } from "@/components/ui/tool-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { submitThumbsUp, submitFeedback } from "@/api/giniFeedback";
import { useToast } from "@/hooks/use-toast";
import heroBg from "@/assets/hero-bg.jpg";
import { FC, ChangeEvent, useEffect, useRef, useState } from "react";
import RecentsSection from "./components/AIPracticePage/RecentsSection";
import { config } from "../../app.config.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Interface representing a single chat message.
 */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Interface for tracking the feedback state of a specific message.
 */
interface MessageFeedbackState {
  rating: "up" | "down" | null;
  comment: string;
  submitted: boolean;
}

interface ClassItem {
  class_id: number;
  class_name: string;
}

interface SubjectItem {
  subject_id: number;
  subject_name: string;
}

/**
 * Hero section of the AI Gini page, featuring the main title and quick access tools.
 */
const HeroSection = () => (
  <section
    className="relative min-h-screen py-10 px-6 lg:px-12 overflow-y-auto"
    style={{
      backgroundImage: `url(${heroBg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    <div className="max-w-5xl mx-auto text-center">
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 animate-fade-in">
        Study Partner <span className="text-gradient">Anytime Anywhere</span>
      </h1>
      <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto animate-fade-in">
        All your study in one place — learn faster, stress less, score higher
      </p>
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <QuickTool title="Doc Summariser" icon={HomeIcon} href="/summarizer" />
        <QuickTool title="AI Notes" icon={FileText} href="/ai-notes" />
        <QuickTool title="AI Tutor" icon={GraduationCap} href="/ai-tutor" />
        <QuickTool title="AI Practice" icon={ClipboardList} href="/ai-practice" />
      </div>
      <ChatBox />
    </div>
  </section>
);

/**
 * Props for the WelcomeScreen component.
 */
interface WelcomeScreenProps {
  input: string;
  setInput: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  selectedSubject: string;
  setSelectedSubject: (value: string) => void;
  classes: ClassItem[];
  subjects: SubjectItem[];
  handleSend: () => void;
  isLoading: boolean;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  uploadedFile: File | null;
}

/**
 * Initial screen shown before any messages are sent, providing input for questions and file uploads.
 */
const WelcomeScreen: FC<WelcomeScreenProps> = ({
  input,
  setInput,
  language,
  setLanguage,
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject,
  classes,
  subjects,
  handleSend,
  isLoading,
  handleFileChange,
  uploadedFile,
}) => (
  <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 text-left">
    {/* Mascot */}
    <div className="w-28 sm:w-36 flex-shrink-0 animate-float self-center">
      <img
        alt="AI Gini"
        className="w-full h-full object-contain drop-shadow-lg"
        src="/lovable-uploads/b1136e5e-34ad-4526-9763-27d3381c9bed.png"
      />
    </div>

    {/* Form — explicitly left-aligned so hero section text-center doesn't bleed in */}
    <div className="flex-1 w-full space-y-3 text-left">
      {/* Upload row */}
      <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        <Upload className="w-3.5 h-3.5" />
        <span>
          Upload <span className="text-secondary font-semibold">Image</span> or{" "}
          <span className="text-primary font-semibold">PDF</span>
        </span>
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={handleFileChange}
        />
      </label>
      {uploadedFile && (
        <p className="text-xs text-foreground/70 -mt-1">📎 {uploadedFile.name}</p>
      )}

      {/* Dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-fit h-7 border border-border/40 bg-muted/60 rounded-full px-3 text-xs text-muted-foreground gap-1 focus:ring-0 focus:ring-offset-0">
            <Globe className="w-3 h-3" />
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Hindi">Hindi</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-fit h-7 border border-border/40 bg-muted/60 rounded-full px-3 text-xs text-muted-foreground gap-1 focus:ring-0 focus:ring-offset-0">
            <MonitorSmartphone className="w-3 h-3" />
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Class</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.class_id} value={cls.class_name.toString()}>
                {cls.class_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-fit h-7 border border-border/40 bg-muted/60 rounded-full px-3 text-xs text-muted-foreground gap-1 focus:ring-0 focus:ring-offset-0">
            <BookOpen className="w-3 h-3" />
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Subject</SelectItem>
            {subjects.map((sub) => (
              <SelectItem key={sub.subject_id} value={sub.subject_name}>
                {sub.subject_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text input */}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Paste or type your question to get answers"
        className="h-11 text-sm bg-white/60 border-border/40 focus-visible:ring-primary/30"
      />

      {/* Get answer button */}
      <Button
        onClick={handleSend}
        disabled={(!input.trim() && !uploadedFile) || isLoading}
        className="w-full h-11 gradient-button text-white font-semibold text-sm tracking-wide shadow-edtech hover:shadow-edtech-lg transition-all duration-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Get answer
          </>
        )}
      </Button>
    </div>
  </div>
);

/**
 * Props for the ChatView component.
 */
interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  resetChat: () => void;
  uploadedFile: File | null;
}

/**
 * Component that displays the conversation history and feedback mechanisms.
 */
const ChatView: FC<ChatViewProps> = ({
  messages,
  isLoading,
  input,
  setInput,
  handleSend,
  handleFileChange,
  fileInputRef,
  resetChat,
  uploadedFile,
}) => {
  const { toast } = useToast();
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Record<string, MessageFeedbackState>
  >({});

  // WITH this:
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   // Delay scroll to allow KaTeX math to finish rendering first
  //   const timeout = setTimeout(() => {
  //     bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  //   }, 150);
  //   return () => clearTimeout(timeout);
  // }, [messages, isLoading]);

  useEffect(() => {
    const container = bottomRef.current?.parentElement;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [messages, isLoading]);
  /**
   * Pre-processes content to ensure LaTeX math is correctly identified by remark-math.
   * It converts \( ... \) to $ ... $ and \[ ... \] to $$ ... $$.
   */
  const preprocessContent = (content: string) => {
    return content
      .replace(/\\\( /g, "$")
      .replace(/\\\(/g, "$")
      .replace(/ \\\) /g, "$")
      .replace(/ \\\)/g, "$")
      .replace(/\\\)/g, "$")
      .replace(/\\\[ /g, "$$")
      .replace(/\\\[/g, "$$")
      .replace(/ \\\] /g, "$$")
      .replace(/ \\\]/g, "$$")
      .replace(/\\\]/g, "$$");
  };

  /**
   * Helper to retrieve the user's message and the corresponding AI assistant response.
   */
  const getUserMessageAndResponse = (assistantMessageId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantMessageId);

    if (idx <= 0 || messages[idx]?.role !== "assistant") return null;
    const userMsg = messages[idx - 1];
    const assistantMsg = messages[idx];

    if (userMsg?.role !== "user" || !assistantMsg) return null;
    return {
      userMessage: userMsg,
      response: assistantMsg,
    };
  };

  /**
   * Handles clicking thumbs up/down for a message.
   */
  const handleThumbClick = async (messageId: string, rating: "up" | "down") => {
    const pair = getUserMessageAndResponse(messageId);

    setFeedbackByMessageId((prev) => {
      const current = prev[messageId] ?? {
        rating: null,
        comment: "",
        submitted: false,
      };
      const isSameRating = current.rating === rating;
      const nextRating = isSameRating ? null : rating;

      return {
        ...prev,
        [messageId]: {
          rating: nextRating,
          comment: nextRating === "down" ? current.comment : "",
          submitted: false,
        },
      };
    });

    if (rating === "up" && pair) {
      try {
        await submitThumbsUp(pair.userMessage, pair.response);
      } catch {
        toast({
          title: "Error",
          description: "Failed to submit feedback",
          variant: "destructive",
        });
      }
    }
  };

  /**
   * Updates the feedback comment for a specific message.
   */
  const handleFeedbackChange = (messageId: string, value: string) => {
    setFeedbackByMessageId((prev) => ({
      ...prev,
      [messageId]: {
        rating: prev[messageId]?.rating ?? "down",
        comment: value,
        submitted: prev[messageId]?.submitted ?? false,
      },
    }));
  };

  /**
   * Submits detailed feedback for a message.
   */
  const handleSubmitFeedback = async (messageId: string) => {
    const pair = getUserMessageAndResponse(messageId);
    const feedback = feedbackByMessageId[messageId]?.comment ?? "";

    if (pair) {
      try {
        await submitFeedback(pair.userMessage, pair.response, feedback);
      } catch {
        toast({
          title: "Error",
          description: "Failed to submit feedback",
          variant: "destructive",
        });
        return;
      }
    }

    setFeedbackByMessageId((prev) => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        rating: prev[messageId]?.rating ?? "down",
        comment: prev[messageId]?.comment ?? "",
        submitted: true,
      },
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Conversation header ── */}
      <div className="flex justify-between items-center mb-3 px-1 flex-shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Conversation</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetChat}
          className="text-primary hover:text-primary/80 hover:bg-primary/10 h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Conversation
        </Button>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-3 pb-2">
          {messages.map((message) => {
            const feedback = feedbackByMessageId[message.id];

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[82%] space-y-1">
                  <div
                    className={`${
                      message.role === "user"
                        ? "chat-bubble-user"
                        : "chat-bubble-ai"
                    } text-left`}
                  >
                    <div
                      className={`prose prose-sm max-w-none leading-snug ${
                        message.role === "user"
                          ? "prose-invert text-primary-foreground"
                          : "prose-neutral dark:prose-invert"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        urlTransform={(url) => url}
                        components={{
                          img: ({ node, ...props }) => (
                            <img
                              {...props}
                              className="max-w-[200px] rounded-md my-1"
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              {...props}
                              className="mb-1 last:mb-0 text-left"
                            />
                          ),
                        }}
                      >
                        {preprocessContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {message.role === "assistant" && (
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">Was this helpful?</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 border ${
                            feedback?.rating === "up"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent"
                          }`}
                          onClick={() => handleThumbClick(message.id, "up")}
                          disabled={isLoading}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 border ${
                            feedback?.rating === "down"
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-transparent"
                          }`}
                          onClick={() => handleThumbClick(message.id, "down")}
                          disabled={isLoading}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {feedback?.rating === "down" && (
                        <div className="flex flex-col gap-1.5">
                          <span>Please share what was not helpful:</span>
                          <Input
                            value={feedback.comment}
                            onChange={(e) =>
                              handleFeedbackChange(message.id, e.target.value)
                            }
                            placeholder="Type your feedback here"
                            className="h-7 text-xs"
                            disabled={isLoading || feedback.submitted}
                          />
                          {feedback.submitted ? (
                            <span className="text-primary text-xs">
                              Thank you for your feedback!
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 w-fit text-xs"
                              onClick={() => handleSubmitFeedback(message.id)}
                              disabled={isLoading}
                            >
                              Submit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="chat-bubble-ai flex items-center gap-2 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Input bar ── */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/20 mt-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-white/20"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </Button>
        <input
          type="file"
          disabled={isLoading}
          ref={fileInputRef}
          className="hidden"
          accept="image/*,.pdf"
          onChange={handleFileChange}
        />
        <div className="flex-1 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your question here..."
            className="pr-20 h-10 text-sm bg-white/70 dark:bg-black/30 border-white/40 backdrop-blur-sm rounded-full px-4 focus-visible:ring-primary/40"
            disabled={isLoading}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              onClick={handleSend}
              size="icon"
              className="h-7 w-7 rounded-full gradient-button shadow-sm"
              disabled={(!input.trim() && !uploadedFile) || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetChat}
          className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-white/20"
          disabled={isLoading}
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

/**
 * Container component for the AI Gini chat, toggling between the welcome screen and chat view.
 */
const ChatBox = () => {
  const {
    messages,
    input,
    setInput,
    language,
    setLanguage,
    selectedClass,
    setSelectedClass,
    selectedSubject,
    setSelectedSubject,
    isLoading,
    historyLoading,
    uploadedFile,
    fileInputRef,
    handleSend,
    handleFileChange,
    resetChat,
  } = useChat();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const localAuth = localStorage.getItem("schools2ai_auth");
  const token = localAuth ? JSON.parse(localAuth).token : null;

  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${config.server}/api/classes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          setClasses(result.data);
          if (result.data.length > 0 && !selectedClass) {
            setSelectedClass("all");
          }
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, [token, setSelectedClass]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClass || !token) return;

      const currentClass = classes.find((cls) => {
        if (cls.class_name.toString() === selectedClass) {
          return cls.class_id;
        }
      });
      if (!currentClass) return;

      try {
        const auth = localAuth ? JSON.parse(localAuth) : null;
        const board = auth?.user?.board || "CBSE";

        const response = await fetch(
          `${config.server}/api/subjects?class_id=${currentClass.class_id}&board=${board}&language=${language}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const result = await response.json();
        if (result.success) {
          setSubjects(result.data);
          if (result.data.length > 0) {
            setSelectedSubject("all");
          }
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, [selectedClass, classes, token, setSelectedSubject, language, localAuth]);

  // In chat mode, give a taller card; in welcome mode, auto-height compact card
  const isInChat = messages.length > 0 || historyLoading;

  return (
    <div className="max-w-3xl mx-auto">
      <div
        className={`rounded-2xl overflow-hidden transition-all duration-300 ${
          isInChat ? "flex flex-col" : ""
        }`}
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.7) inset",
          ...(isInChat
            ? { height: "calc(100vh - 320px)", minHeight: "420px" }
            : {}),
        }}
      >
        <div
          className={`${
            isInChat
              ? "flex-1 flex flex-col p-5 min-h-0 h-full"
              : "p-6 md:p-8"
          }`}
        >
          {/* History loading spinner */}
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              input={input}
              setInput={setInput}
              language={language}
              setLanguage={setLanguage}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              selectedSubject={selectedSubject}
              setSelectedSubject={setSelectedSubject}
              classes={classes}
              subjects={subjects}
              handleSend={handleSend}
              isLoading={isLoading}
              handleFileChange={handleFileChange}
              uploadedFile={uploadedFile}
            />
          ) : (
            <ChatView
              messages={messages}
              isLoading={isLoading}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              handleFileChange={handleFileChange}
              fileInputRef={fileInputRef}
              resetChat={resetChat}
              uploadedFile={uploadedFile}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The main page component for AI Gini, featuring a personalized AI tutor interface.
 */
export default function AIGiniPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeroSection />
      {/* <RecentsSection /> */}
    </div>
  );
}
