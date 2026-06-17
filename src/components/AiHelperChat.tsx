"use client";

import { useEffect, useRef, useState } from "react";

type Context = "before_reading" | "during_reading" | "association" | "quote" | "review";

export function AiHelperChat({ context }: { context: Context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      fetchHelp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchHelp(userMessage?: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, message: userMessage }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    await fetchHelp(msg);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-koala-accent text-2xl shadow-lg hover:scale-105"
        title="독서 도우미 코알라"
      >
        🐨
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-96 w-80 flex-col overflow-hidden rounded-koala-lg border border-koala-secondary/50 bg-koala-card shadow-xl">
          <div className="flex items-center justify-between bg-koala-primary px-4 py-3 text-white">
            <span className="font-medium">독서 도우미 코알라</span>
            <button type="button" onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-koala px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-8 bg-koala-primary/20 text-koala-text"
                    : "mr-4 bg-koala-secondary/30 text-koala-text"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-sm text-koala-muted">생각 중...</div>}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t border-koala-secondary/30 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="무엇이 어려운가요?"
              className="koala-input flex-1 py-2 text-sm"
            />
            <button type="button" onClick={send} disabled={loading} className="koala-btn-primary px-3 text-sm">
              전송
            </button>
          </div>
        </div>
      )}
    </>
  );
}
