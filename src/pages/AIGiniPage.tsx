import { useState } from "react";
import { Link } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import heroBg from "@/assets/hero-bg.jpg";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `http://localhost:3000/gini/ai/gini`;

export default function AIGiniPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as
              | string
              | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: assistantContent }
                      : m,
                  );
                }
                return [
                  ...prev,
                  {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: assistantContent,
                  },
                ];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    // You can integrate your AI backend file handling here
    console.log("Selected file:", file);
    toast({
      title: "File uploaded",
      description: file.name,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
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
            Study Partner{" "}
            <span className="text-gradient">Anytime Anywhere</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            All your study in one place — learn faster, stress less, score
            higher
          </p>

          {/* Quick tools */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <QuickTool
              title="Doc Summariser"
              icon={HomeIcon}
              href="/summarizer"
            />
            <QuickTool title="AI Notes" icon={FileText} href="/ai-notes" />
            <QuickTool title="AI Tutor" icon={GraduationCap} href="/ai-tutor" />
            <QuickTool
              title="AI Practice"
              icon={ClipboardList}
              href="/ai-practice"
            />
          </div>

          {/* AI Chat Box */}
          <div className="max-w-3xl mx-auto">
            <div className="edtech-card glass p-6 md:p-8">
              {messages.length === 0 ? (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Robot mascot */}
                  <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 animate-float">
                    <img
                      alt="AI Gini"
                      className="w-full h-full object-contain"
                      src="/lovable-uploads/b1136e5e-34ad-4526-9763-27d3381c9bed.png"
                    />
                  </div>

                  {/* Input area */}
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      <span>
                        Upload{" "}
                        <span className="text-secondary font-medium">
                          Image
                        </span>{" "}
                        or <span className="text-primary font-medium">PDF</span>{" "}
                        to solve questions
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {/* File Upload */}
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        Upload File
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                      </label>

                      {/* Language */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">
                        <Globe className="w-3.5 h-3.5" />
                        Language
                      </span>

                      {/* Subject */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground">
                        <MonitorSmartphone className="w-3.5 h-3.5" />
                        Subject
                      </span>
                    </div>

                    {/* Input */}
                    <div className="relative">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Paste or type your question to get answers"
                        className="h-12 pr-4 text-base bg-background/80 border-border/50"
                      />
                    </div>

                    {/* CTA Button */}
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
              ) : (
                <div className="space-y-4">
                  {/* Chat messages */}
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={
                              message.role === "user"
                                ? "chat-bubble-user max-w-[80%]"
                                : "chat-bubble-ai max-w-[80%]"
                            }
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {isLoading &&
                        messages[messages.length - 1]?.role === "user" && (
                          <div className="flex justify-start">
                            <div className="chat-bubble-ai max-w-[80%] flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Thinking...
                            </div>
                          </div>
                        )}
                    </div>
                  </ScrollArea>

                  {/* Input area for continued chat */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Paperclip className="w-5 h-5 text-muted-foreground" />
                    </Button>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                        </Button>
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
                      onClick={() => setMessages([])}
                      className="flex-shrink-0"
                      disabled={isLoading}
                    >
                      <RotateCcw className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recents Section */}
      <section className="py-10 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Recents
            </h2>
            <Link
              to="/history"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Go to Recent History
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Empty state */}
          <div className="edtech-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              No recent activity
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start learning with our AI tools to see your recent activity here
            </p>
            <Button variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Explore AI Tools
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
