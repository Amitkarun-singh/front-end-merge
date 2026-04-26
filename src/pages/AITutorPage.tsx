import { useState, useEffect, useRef } from "react";
import { DotLottieReact, DotLottie } from "@lottiefiles/dotlottie-react";
import {
  GraduationCap,
  Mic,
  Globe,
  Sparkles,
  RotateCcw,
  Loader2,
  MicOff,
  Square,
  Play,
  ArrowLeft,
  User,
  Clock,
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
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchConversation, Conversation, ConversationMessage } from "@/api/historyApi";
import { Badge } from "@/components/ui/badge";
import schools2aiIcon from "@/assets/schools2ai-icon.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { config } from "../../app.config.js";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const local = JSON.parse(localStorage.getItem("schools2ai_auth"));
const token = local?.token;

// ─── Inline history helpers ───────────────────────────────────────────────────
function _formatTime(raw: string | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function _preprocessLatex(content: string): string {
  return content
    .replace(/\\\(/g, "$").replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$").replace(/\\\]/g, "$$");
}

function HistoryMsgBubble({ msg }: { msg: ConversationMessage }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end group">
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
          {msg.timestamp && (
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />{_formatTime(msg.timestamp)}
            </span>
          )}
        </div>
        <div className="ml-2 flex-shrink-0 self-end">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start group">
      <div className="mr-2 flex-shrink-0 self-end">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shadow-sm">
          <img src={schools2aiIcon} alt="AI" className="w-5 h-5 object-contain" />
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 max-w-[80%]">
        <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {_preprocessLatex(msg.content)}
            </ReactMarkdown>
          </div>
        </div>
        {msg.timestamp && (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{_formatTime(msg.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AITutorPage() {
  const [sessionId] = useState(() => Date.now().toString());
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en-IN");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const { toast } = useToast();
  const dotLottieRef = useRef<DotLottie | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // ── History view state ─────────────────────────────────────────────
  const location = useLocation();
  const navigate = useNavigate();
  const { token: authToken } = useAuth();
  const locationState = location.state as { conversationId?: string; source?: string } | null;
  const historyConvId = locationState?.conversationId ?? null;
  const historySource = locationState?.source ?? "tutor";

  const [historyConv, setHistoryConv] = useState<Conversation | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!historyConvId || !authToken) return;
    setHistoryLoading(true);
    setHistoryError(null);
    fetchConversation(authToken, historyConvId, historySource)
      .then(setHistoryConv)
      .catch((e) => setHistoryError(e.message))
      .finally(() => setHistoryLoading(false));
  }, [historyConvId, authToken, historySource]);

  useEffect(() => {
    if (!historyLoading && historyConv?.messages.length) {
      historyBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [historyLoading, historyConv]);

  const dotLottieCallback = (dotLottie: DotLottie) => {
    dotLottieRef.current = dotLottie;
  };

  useEffect(() => {
    if (dotLottieRef.current) {
      if (isSpeaking) {
        dotLottieRef.current.play();
      } else {
        dotLottieRef.current.pause();
      }
    }
  }, [isSpeaking]);

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    setIsListening(false);
  };

  const handleVoiceInput = async () => {
    stopSpeaking();

    if (isListening) {
      stopVoiceRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Not Supported",
        description: "Audio recording is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.onstart = () => {
        setIsListening(true);
      };

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        toast({
          title: "Error",
          description: "Audio recording failed.",
          variant: "destructive",
        });
      };

      recorder.onstop = async () => {
        setIsListening(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const audioBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioBlob.size === 0) {
          return;
        }

        try {
          await handleAsk(undefined, audioBlob);
        } catch (error) {
          console.error("Audio send error:", error);
          toast({
            title: "Error",
            description: "Failed to send recorded audio.",
            variant: "destructive",
          });
        }
      };

      recorder.start();
    } catch (error) {
      console.error("Microphone access error:", error);
      toast({
        title: "Microphone Error",
        description: "Unable to access your microphone.",
        variant: "destructive",
      });
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const playBase64Audio = (base64Data: string) => {
    stopSpeaking();

    try {
      const audioSrc = `data:audio/wav;base64,${base64Data}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);

      audio.play().catch((err) => {
        console.error("Error playing audio:", err);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error("Error creating audio object:", error);
      setIsSpeaking(false);
    }
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      // Optional: find a voice that matches the language
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) =>
        v.lang.startsWith(language.split("-")[0]),
      );
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReplay = () => {
    if (lastAudio) {
      playBase64Audio(lastAudio);
    } else if (answer) {
      speak(answer);
    }
  };

  const [conversation, setConversation] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const handleAsk = async (textOverride?: string, voiceBlob?: Blob) => {
    const query = textOverride || question;
    const hasText = query.trim().length > 0;
    const hasAudio = !!voiceBlob;
    if (!hasText && !hasAudio) return;

    stopSpeaking();
    setIsLoading(true);
    setShowAnswer(true);
    setAnswer("");
    setLastAudio(null);
    // Clear any history conversation loaded from the History tab
    setHistoryConv(null);

    try {
      const messagePayload = [
        ...conversation,
        { role: "user", content: hasText ? query : "[Voice message]" },
      ];

      const formData = new FormData();
      formData.append("message", JSON.stringify(messagePayload));
      formData.append("sessionId", sessionId);

      if (voiceBlob) {
        const extension = voiceBlob.type.includes("webm") ? "webm" : "wav";
        formData.append("user_audio", voiceBlob, `recording.${extension}`);
      }

      const response = await fetch(`${config.server}/gini/voice-bot`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI Tutor");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let resolvedUserQuery = query; // fallback to original text input

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          const jsonStr = line.slice("data:".length).trim();
          if (!jsonStr) continue;

          let event: {
            type: string;
            transcript?: string;
            role?: string;
            content?: string;
            audio?: string;
            userQuery?: string | null;
            message?: string;
          };

          try {
            event = JSON.parse(jsonStr);
          } catch {
            console.warn("Failed to parse SSE event:", jsonStr);
            continue;
          }

          if (event.type === "stt") {
            // STT is the transcribed version of the user's voice — store it
            // so conversation history uses the actual spoken text
            if (event.transcript) {
              resolvedUserQuery = event.transcript;
              setQuestion(event.transcript);
            }
          } else if (event.type === "final") {
            const botResponse = event.content ?? "";

            setAnswer(botResponse);

            setConversation((prev) => [
              ...prev,
              { role: "user", content: resolvedUserQuery },
              { role: "assistant", content: botResponse },
            ]);

            if (event.audio) {
              setLastAudio(event.audio);
              playBase64Audio(event.audio);
            } else {
              speak(botResponse);
            }
          } else if (event.type === "error") {
            throw new Error(event.message ?? "Unknown server error");
          }
        }
      }
    } catch (error) {
      console.error("Error asking AI Tutor:", error);
      setAnswer(
        "Sorry, I encountered an error while processing your request. Please try again.",
      );
      toast({
        title: "Error",
        description:
          "Failed to connect to the AI Tutor. Please check if the server is running.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setQuestion("");
    setAnswer("");
    setShowAnswer(false);
    setLastAudio(null);
    stopSpeaking();
  };

  // Pre-load voices for TTS
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      stopVoiceRecording();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      stopSpeaking();
    };
  }, []);


  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            AI Tutor
          </h1>
          <p className="text-muted-foreground mt-1">
            Your personal one-on-one virtual tutor
          </p>
        </div>

        {/* Tutor Interface */}
        <div className="edtech-card overflow-hidden">
          {/* Visual area */}
          <div className="relative h-80 md:h-80 gradient-hero flex items-center justify-center">
            {isSpeaking ? (
              <Button
                variant="outline"
                size="sm"
                onClick={stopSpeaking}
                className="absolute top-4 right-4 z-10 backdrop-blur-md transition-all animate-in fade-in zoom-in"
              >
                <Square className="w-3 h-3 mr-2 fill-red-600" />
                Stop
              </Button>
            ) : (
              showAnswer &&
              !isLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplay}
                  className="absolute top-4 right-4 z-10  backdrop-blur-md transition-all animate-in fade-in zoom-in"
                >
                  <Play className="w-3 h-3 mr-2 fill-green-600" />
                  Replay
                </Button>
              )
            )}
            <div
              className={`${isListening ? "animate-pulse scale-105" : ""} transition-all duration-300 w-72 h-72 md:w-[500px] md:h-[500px]`}
            >
              <DotLottieReact
                src="/Aigini_final_trimmed_video.lottie"
                loop
                dotLottieRefCallback={dotLottieCallback}
              />
            </div>

            {/* Mic button */}
            <button
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
                isListening
                  ? "bg-red-500 scale-110 animate-pulse"
                  : "bg-card hover:scale-105"
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-primary" />
              )}
            </button>
            <p className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full text-sm text-muted-foreground pt-2">
              {isListening ? "Recording... tap to stop" : "Tap to record"}
            </p>
          </div>

          {/* Q&A Area */}
          <div className="p-6 space-y-4">
            {/* Language selector */}
            <div className="flex justify-end">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-auto">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>

                  <SelectItem value="hi-IN">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Student:
              </label>
              <div className="flex gap-3">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="What is Euclid's Division Lemma?"
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleAsk()}
                  className="gradient-button"
                  disabled={!question.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Ask
                </Button>
              </div>
            </div>

            {/* Bot box — shows live answer OR loaded history conversation */}
            {(showAnswer || historyConvId) && (
              <div className="p-4 rounded-xl bg-accent/50 animate-fade-in">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Bot:
                </label>

                {/* ── Live answer from current question ── */}
                {showAnswer && (
                  isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Thinking...
                    </div>
                  ) : (
                    <>
                      <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {answer}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={resetChat}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Ask Another Question
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="w-4 h-4" />
                          Step-by-step explanation
                        </div>
                      </div>
                    </>
                  )
                )}

                {/* ── History conversation (no date divider) ── */}
                {!showAnswer && historyConvId && (
                  <>
                    {historyLoading && (
                      <div className="flex items-center gap-2 py-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm">Loading conversation…</span>
                      </div>
                    )}
                    {!historyLoading && historyError && (
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Failed to load: {historyError}</span>
                      </div>
                    )}
                    {!historyLoading && !historyError && historyConv && historyConv.messages.length > 0 && (
                      <div className="space-y-4">
                        {historyConv.messages.map((msg, i) => (
                          <HistoryMsgBubble key={i} msg={msg} />
                        ))}
                        <div ref={historyBottomRef} />
                      </div>
                    )}
                    {!historyLoading && !historyError && historyConv && historyConv.messages.length === 0 && (
                      <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick questions */}
        <div className="mt-8">
          <h3 className="font-semibold text-foreground mb-4">
            Popular Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "What is the Fundamental Theorem of Arithmetic?",
              "Explain the concept of irrational numbers",
              "How to find HCF using Euclid's algorithm?",
              "What are rational numbers?",
            ].map((q) => (
              <button
                key={q}
                disabled={isLoading}
                onClick={() => {
                  setQuestion(q);
                  handleAsk(q);
                }}
                className="text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-sm disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
