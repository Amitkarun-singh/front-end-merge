import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />,
    error:   <XCircle    className="w-5 h-5 text-red-400   flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
  };

  const colors: Record<ToastType, string> = {
    success: "border-green-500/40 bg-green-950/80",
    error:   "border-red-500/40   bg-red-950/80",
    warning: "border-amber-500/40 bg-amber-950/80",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-2xl
              pointer-events-auto animate-in slide-in-from-right-5 duration-300 max-w-sm ${colors[t.type]}`}
          >
            {icons[t.type]}
            <span className="text-sm text-white flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-white/50 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
