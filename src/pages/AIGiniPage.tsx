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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuickTool } from "@/components/ui/tool-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import heroBg from "@/assets/hero-bg.jpg";
import { FC, ChangeEvent } from "react";
import RecentsSection from "./components/AIPracticePage/RecentsSection";
import { useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const HeroSection = () => (
  <section
    className="relative py-12 px-6 lg:px-12 overflow-hidden"
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

interface WelcomeScreenProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  uploadedFile: File | null;
}

const WelcomeScreen: FC<WelcomeScreenProps> = ({
  input,
  setInput,
  handleSend,
  isLoading,
  handleFileChange,
  uploadedFile,
}) => (
  <div className="flex flex-col md:flex-row items-center gap-6">
    <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 animate-float">
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">
          <Globe className="w-3.5 h-3.5" />
          Language
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">
          <MonitorSmartphone className="w-3.5 h-3.5" />
          Subject
        </span>
      </div>
      <div className="relative">
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
        disabled={!input.trim() || isLoading}
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

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  resetChat: () => void;
}

const ChatView: FC<ChatViewProps> = ({
  messages,
  isLoading,
  input,
  setInput,
  handleSend,
  handleFileChange,
  fileInputRef,
  resetChat,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={
                  message.role === "user"
                    ? "chat-bubble-user max-w-[80%]"
                    : "chat-bubble-ai max-w-[80%]"
                }
              >
                {message.content.startsWith("![") ? (
                  <img
                    src={message.content.match(/\((.*?)\)/)?.[1]}
                    alt={message.content.match(/\[(.*?)\]/)?.[1]}
                    className="max-w-[200px] rounded-md"
                  />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
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
      <div className="flex items-center gap-3 pt-4 border-t border-border">
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
              disabled={!input.trim() || isLoading}
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

const ChatBox = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    uploadedFile,
    fileInputRef,
    handleSend,
    handleFileChange,
    resetChat,
  } = useChat();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="edtech-card glass p-6 md:p-8">
        {messages.length === 0 ? (
          <WelcomeScreen
            input={input}
            setInput={setInput}
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
          />
        )}
      </div>
    </div>
  );
};

export default function AIGiniPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeroSection />
      <RecentsSection />
    </div>
  );
}
