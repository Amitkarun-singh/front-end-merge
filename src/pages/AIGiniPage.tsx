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
    className="relative h-screen py-12 px-6 lg:px-12 overflow-hidden"
    style={{
      backgroundImage: `url(${heroBg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    <div className="max-w-5xl mx-auto text-center">
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in">
        Study Partner <span className="text-gradient">Anytime Anywhere</span>
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
        All your study in one place — learn faster, stress less, score higher
      </p>
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        <QuickTool title="Doc Summariser" icon={HomeIcon} href="/summarizer" />
        <QuickTool title="AI Notes" icon={FileText} href="/ai-notes" />
        <QuickTool title="AI Tutor" icon={GraduationCap} href="/ai-tutor" />
        <QuickTool
          title="AI Practice"
          icon={ClipboardList}
          href="/ai-practice"
        />
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
  <div className="flex flex-col md:flex-row items-center gap-6">
    <div className="w-32  md:w-40 md:h-40 flex-shrink-0 animate-float">
      <img
        alt="AI Gini"
        className="w-full h-full object-contain"
        src="/lovable-uploads/b1136e5e-34ad-4526-9763-27d3381c9bed.png"
      />
    </div>
    <div className="flex-1 w-full space-y-4">
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>
            Upload <span className="text-secondary font-medium">Image</span> or{" "}
            <span className="text-primary font-medium">PDF</span>
          </span>
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileChange}
          />
        </label>
        {uploadedFile && (
          <div className="text-sm text-foreground">
            Uploaded: {uploadedFile.name}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-fit h-7 border-none bg-muted rounded-full px-3 py-1 text-sm text-muted-foreground gap-1.5 focus:ring-0 focus:ring-offset-0">
            <Globe className="w-3.5 h-3.5" />
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Hindi">Hindi</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-fit h-7 border-none bg-muted rounded-full px-3 py-1 text-sm text-muted-foreground gap-1.5 focus:ring-0 focus:ring-offset-0">
            <MonitorSmartphone className="w-3.5 h-3.5" />
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
          <SelectTrigger className="w-fit h-7 border-none bg-muted rounded-full px-3 py-1 text-sm text-muted-foreground gap-1.5 focus:ring-0 focus:ring-offset-0">
            <BookOpen className="w-3.5 h-3.5" />
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
      <div className="relative ">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Paste or type your question to get answers"
          className="h-12 pr-4 text-base bg-background/80 border-border/50"
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={(!input.trim() && !uploadedFile) || isLoading}
        className="w-full h-12 gradient-button text-primary-foreground font-medium text-base shadow-edtech hover:shadow-edtech-lg transition-shadow"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
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

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
    <div className="h-[800px] flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="font-medium text-foreground">Conversation</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetChat}
          className="text-primary hover:text-primary/80 hover:bg-primary/10"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Conversation
        </Button>
      </div>
      <ScrollArea className="h-auto pr-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const feedback = feedbackByMessageId[message.id];

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[80%] space-y-1">
                  <div
                    className={`${
                      message.role === "user"
                        ? "chat-bubble-user"
                        : "chat-bubble-ai"
                    } text-left`}
                  >
                    <div
                      className={`prose prose-sm max-w-none ${
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
                              className="max-w-[200px] rounded-md my-2"
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              {...props}
                              className="mb-2 last:mb-0 text-left"
                            />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {message.role === "assistant" && (
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="mr-1">Was this helpful?</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 border ${
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
                          className={`h-7 w-7 border ${
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
                        <div className="flex flex-col gap-2">
                          <span>Please share what was not helpful:</span>
                          <Input
                            value={feedback.comment}
                            onChange={(e) =>
                              handleFeedbackChange(message.id, e.target.value)
                            }
                            placeholder="Type your feedback here"
                            className="h-8 text-xs"
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
                              className="h-8 w-fit text-xs"
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
              <div className="chat-bubble-ai max-w-[80%] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="flex items-center gap-3 pt-4 border-t border-border mt-auto">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <input
            type="file"
            disabled={isLoading}
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex-1 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your question here..."
            className="pr-24 h-12 text-base"
            disabled={isLoading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              onClick={handleSend}
              size="icon"
              className="h-8 w-8 gradient-button"
              disabled={(!input.trim() && !uploadedFile) || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetChat}
          className="flex-shrink-0"
          disabled={isLoading}
        >
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="edtech-card glass p-6 md:p-8">
        {messages.length === 0 ? (
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
