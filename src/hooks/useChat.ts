import { useState, useRef, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { config } from "../../app.config.js";
import { fetchConversation } from "@/api/historyApi";

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
  // Priority: location.state.conversationId  →  ?conversation_id URL param
  // After reading the URL param we immediately clean the URL (no visible ID).
  useEffect(() => {
    // 1. Try state (passed via navigate(path, { state: { conversationId } }))
    const stateConvId: string | undefined =
      (location.state as Record<string, string> | null)?.conversationId;
    // 2. Fall back to URL search param (e.g., bookmarked links)
    const urlConvId = stateConvId ?? searchParams.get("conversation_id") ?? null;
    const source   = (location.state as Record<string, string> | null)?.source
      ?? searchParams.get("source")
      ?? undefined;

    if (!urlConvId) return;

    // Remove ?conversation_id from the address bar so it's never visible
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
        console.log(
          `[useChat] Loaded ${mapped.length} messages from conversation ${urlConvId}`,
        );
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
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sends the current user input and any uploaded file to the AI assistant.
   */
  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    let newMessages = messages;

    if (input.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };
      newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
    }

    setIsLoading(true);

    let assistantContent = "";

    try {
      const formData = new FormData();
      formData.append("messages", JSON.stringify(newMessages));
      formData.append("language", language);
      formData.append("conversation_id", conversationId);

      if (selectedClass) formData.append("class", selectedClass);
      if (selectedSubject) formData.append("subject", selectedSubject);
      if (uploadedFile) formData.append("file", uploadedFile);

      const local = JSON.parse(localStorage.getItem("schools2ai_auth"));
      const token = local.token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
