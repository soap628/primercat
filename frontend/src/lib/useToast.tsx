"use client";

import { createContext, useCallback, useContext, useState, useRef } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
      }}>
        {items.map((item) => (
          <div key={item.id} style={{
            padding: "10px 16px",
            background: item.type === "success" ? "var(--green)" : item.type === "error" ? "var(--red)" : "var(--text-1)",
            color: "#fff",
            borderRadius: "var(--r-lg)",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "var(--shadow-lg)",
            animation: "toast-in 0.2s ease",
            whiteSpace: "nowrap",
          }}>
            {item.type === "success" ? "✓ " : item.type === "error" ? "✗ " : ""}
            {item.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
