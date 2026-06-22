"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { iconMd, iconSm } from "@/lib/icon-styles";
import type { ReviewDraft } from "@/lib/ai-helper";

type UiMessage = { role: "user" | "bot"; text: string };

interface AiHelperChatProps {
  bookTitle?: string;
  reviewDraft: Omit<ReviewDraft, "bookTitle">;
}

export function AiHelperChat({ bookTitle, reviewDraft }: AiHelperChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  const draftPayload: ReviewDraft = {
    bookTitle,
    ...reviewDraft,
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && !greetedRef.current) {
      greetedRef.current = true;
      void requestReply([], true);
    }
  }, [open]);

  function toApiMessages(history: UiMessage[]) {
    return history.map((m) => ({
      role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));
  }

  async function requestReply(history: UiMessage[], isGreeting = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "review",
          messages: toApiMessages(history),
          reviewDraft: draftPayload,
          isGreeting,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    const nextHistory: UiMessage[] = [...messages, { role: "user", text: msg }];
    setMessages(nextHistory);
    await requestReply(nextHistory);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-koala-accent text-white shadow-lg transition hover:scale-105"
        title="감상문 도우미"
      >
        <MessageCircle className={iconMd} aria-hidden />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-96 w-80 flex-col overflow-hidden rounded-koala-lg border border-koala-secondary/50 bg-koala-card shadow-xl">
          <div className="flex items-center justify-between bg-koala-primary px-4 py-3 text-white">
            <span className="inline-flex items-center gap-2 font-medium">
              <MessageCircle className={iconSm} aria-hidden />
              감상문 도우미
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-pill p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="닫기"
            >
              <X className={iconSm} />
            </button>
          </div>
          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto bg-koala-bg/50 p-3"
          >
            <div className="space-y-3">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="w-full">
                    <div className="ml-auto max-w-[88%] w-fit rounded-koala rounded-br-sm bg-koala-primary px-3 py-2 text-sm text-white whitespace-pre-wrap shadow-sm">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="w-full">
                    <p className="mb-1 px-1 text-xs font-medium text-koala-primary">감상문 도우미</p>
                    <div className="max-w-[88%] w-fit rounded-koala rounded-bl-sm bg-koala-card px-3 py-2 text-sm text-koala-text whitespace-pre-wrap shadow-sm ring-1 ring-koala-secondary/30">
                      {m.text}
                    </div>
                  </div>
                )
              )}
              {loading && (
                <div className="w-full">
                  <p className="mb-1 px-1 text-xs font-medium text-koala-primary">감상문 도우미</p>
                  <div className="max-w-[88%] w-fit rounded-koala rounded-bl-sm bg-koala-card px-3 py-2 text-sm text-koala-muted shadow-sm ring-1 ring-koala-secondary/30">
                    생각 중...
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t border-koala-secondary/30 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="생각나는 말을 적어 보세요"
              className="koala-input flex-1 py-2 text-sm"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading}
              className="koala-btn-primary inline-flex items-center justify-center p-2.5"
              aria-label="전송"
            >
              <Send className={iconSm} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
