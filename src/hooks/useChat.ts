import { useState, useRef, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { config } from "../../app.config.js";
import { fetchConversation } from "@/api/historyApi";
import { fetchEventSource } from "@microsoft/fetch-event-source";

/**
 * Interface representing a single chat message.
 */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Endpoint for the AI Gini chat service. */
const CHAT_URL = `${config.server}/gini/ai/gini`;

/**
 * A custom hook to manage chat state and interactions with the AI assistant.
 * If the URL contains ?conversation_id=xxx it pre-loads that conversation
 * from history so it renders in the same chat format and can be continued.
 */
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [conversationId, setConversationId] = useState<string>(() =>
    Date.now().toString(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // ── Pre-load a past conversation ─────────────────────────────────────────────
  useEffect(() => {
    const stateConvId: string | undefined = (
      location.state as Record<string, string> | null
    )?.conversationId;
    const urlConvId =
      stateConvId ?? searchParams.get("conversation_id") ?? null;
    const source =
      (location.state as Record<string, string> | null)?.source ??
      searchParams.get("source") ??
      undefined;

    if (!urlConvId) return;

    if (searchParams.get("conversation_id")) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }

    const localAuth = localStorage.getItem("schools2ai_auth");
    const token = localAuth ? JSON.parse(localAuth).token : null;
    if (!token) return;

    setHistoryLoading(true);
    setConversationId(urlConvId);

    fetchConversation(token, urlConvId, source)
      .then((conv) => {
        const mapped: Message[] = conv.messages.map((m, i) => ({
          id: `history-${i}`,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));
        setMessages(mapped);
      })
      .catch((err) => {
        console.warn("[useChat] Failed to load history:", err.message);
        toast({
          title: "Could not load conversation",
          description: err.message,
          variant: "destructive",
        });
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  /**
   * Sends the current user input and any uploaded file to the AI assistant.
   */
  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    let currentMessages = messages;

    if (input.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };
      currentMessages = [...messages, userMessage];
      setMessages(currentMessages);
      setInput("");
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("messages", JSON.stringify(currentMessages));
      formData.append("language", language);
      formData.append("conversation_id", conversationId);

      if (selectedClass) formData.append("class", selectedClass);
      if (selectedSubject) formData.append("subject", selectedSubject);
      if (uploadedFile) formData.append("file", uploadedFile);

      const local = JSON.parse(localStorage.getItem("schools2ai_auth") || "{}");
      const token = local?.token;

      let assistantContent = "";
      const controller = new AbortController();

      await fetchEventSource(CHAT_URL, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        async onopen(response) {
          if (response.ok) {
            return;
          } else if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to connect to chat");
          } else {
            throw new Error("Server error occurred");
          }
        },
        onmessage(ev) {
          try {
            const parsed = JSON.parse(ev.data);
            console.log("parsed ->", ev.event === "done");
            console.log("parsed ->", ev.event);

            if (ev.event === "message") {
              const content = parsed.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (
                    last?.role === "assistant" &&
                    !last.id.startsWith("history-")
                  ) {
                    return prev.map((m, i) =>
                      i === prev.length - 1
                        ? { ...m, content: assistantContent }
                        : m,
                    );
                  }
                  return [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: assistantContent,
                    },
                  ];
                });
              }
            } else if (ev.event === "error") {
              const errorMsg = parsed.message || "An error occurred";
              toast({
                title:
                  parsed.type === "VALIDATION_ERROR"
                    ? "Validation Error"
                    : "Error",
                description: errorMsg,
                variant: "destructive",
              });
              setIsLoading(false);
              controller.abort();
            } else if (ev.event === "done") {
              setIsLoading(false);
              controller.abort();
            }
          } catch (err) {
            console.error("Error parsing SSE message:", err);
          }
        },
        onerror(err) {
          console.error("SSE Error:", err);
          toast({
            title: "Connection Error",
            description:
              err instanceof Error ? err.message : "Failed to get AI response",
            variant: "destructive",
          });
          throw err; // allow retry or let it fail
        },
        onclose() {
          setIsLoading(false);
          setUploadedFile(null);
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      setUploadedFile(null);
    }
  };

  /** Handles file selection from an input element. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    setUploadedFile(file);

    const fileMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: file.type.startsWith("image/")
        ? `![${file.name}](${URL.createObjectURL(file)})`
        : `Uploaded file: ${file.name}`,
    };

    setMessages((prev) => [...prev, fileMessage]);
  };

  /** Resets the chat history and clears any uploaded files. */
  const resetChat = () => {
    setMessages([]);
    setUploadedFile(null);
    setInput("");
    setConversationId(Date.now().toString());
  };

  /** Loads a past conversation by ID directly into the chat state. */
  const loadConversation = async (convId: string, source?: string) => {
    const localAuth = localStorage.getItem("schools2ai_auth");
    const token = localAuth ? JSON.parse(localAuth).token : null;
    if (!token) return;

    setHistoryLoading(true);
    setMessages([]);
    setConversationId(convId);

    try {
      const conv = await fetchConversation(token, convId, source);
      const mapped: Message[] = conv.messages.map((m, i) => ({
        id: `history-${i}`,
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));
      setMessages(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn("[useChat] Failed to load history:", msg);
      toast({
        title: "Could not load conversation",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    historyLoading,
    uploadedFile,
    fileInputRef,
    handleSend,
    handleFileChange,
    resetChat,
    language,
    setLanguage,
    selectedClass,
    setSelectedClass,
    selectedSubject,
    setSelectedSubject,
    loadConversation,
  };
};
