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
import { config } from "../../app.config.js";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const local = JSON.parse(localStorage.getItem("schools2ai_auth"));
const token = local?.token;

export default function AITutorPage() {
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
    setAnswer(""); // Clear previous answer
    setLastAudio(null);

    try {
      const messagePayload = [
        ...conversation,
        { role: "user", content: hasText ? query : "[Voice message]" },
      ];

      const formData = new FormData();
      formData.append("message", JSON.stringify(messagePayload));

      if (voiceBlob) {
        const extension = voiceBlob.type.includes("webm") ? "webm" : "wav";
        formData.append("user_audio", voiceBlob, `recording.${extension}`);
      }
      console.log("formData ", formData.getAll("user_audio"));
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

      const data = await response.json();
      const botResponse = data.response.content;

      // Update UI
      setAnswer(botResponse);

      // Update conversation history without audio
      setConversation((prev) => [
        ...prev,
        { role: "user", content: query },
        { role: "assistant", content: botResponse },
      ]);

      // Optional: play audio if present
      if (data.response.audio) {
        setLastAudio(data.response.audio);
        playBase64Audio(data.response.audio);
      } else {
        speak(botResponse);
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

            {/* Answer */}
            {showAnswer && (
              <div className="p-4 rounded-xl bg-accent/50 animate-fade-in">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Bot:
                </label>
                {isLoading ? (
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
