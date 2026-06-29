"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { iconMd, iconSm } from "@/lib/icon-styles";
import type { ReviewDraft } from "@/lib/ai-helper";
import {
  AI_HELPER_FAREWELL_MESSAGE,
  AI_HELPER_MAX_USER_MESSAGES,
} from "@/lib/ai-helper-limits";
import { alertContentFilterApiError } from "@/lib/content-filter-client";

type UiMessage = { role: "user" | "bot"; text: string };

interface AiHelperChatProps {
  bookId?: string;
  bookTitle?: string;
  reviewDraft: Omit<ReviewDraft, "bookTitle">;
}

function countUserMessages(history: UiMessage[]) {
  return history.filter((message) => message.role === "user").length;
}

export function AiHelperChat({ bookId, bookTitle, reviewDraft }: AiHelperChatProps) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  const draftPayload: ReviewDraft = {
    bookTitle,
    ...reviewDraft,
  };

  const userMessageCount = countUserMessages(messages);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && !greetedRef.current && !hidden) {
      greetedRef.current = true;
      void requestReply([], true);
    }
  }, [open, hidden]);

  function handleCloseChat() {
    setOpen(false);
    if (limitReached) {
      setHidden(true);
    }
  }

  function toApiMessages(history: UiMessage[]) {
    return history.map((m) => ({
      role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));
  }

  function finishWithFarewell() {
    setMessages((prev) => [...prev, { role: "bot", text: AI_HELPER_FAREWELL_MESSAGE }]);
    setLimitReached(true);
  }

  async function requestReply(history: UiMessage[], isGreeting = false): Promise<boolean> {
    setLoading(true);
    setInputError("");
    try {
      const res = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "review",
          bookId,
          messages: toApiMessages(history),
          reviewDraft: draftPayload,
          isGreeting,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.limitReached) {
          finishWithFarewell();
          return false;
        }
        if (res.status === 400 && data.error) {
          setInputError(data.error);
          return false;
        }
        alertContentFilterApiError(res, data);
        return false;
      }
      if (data.reply) {
        if (isGreeting) {
          setMessages([{ role: "bot", text: data.reply }]);
        } else {
          setMessages([...history, { role: "bot", text: data.reply }]);
        }
      }
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading || limitReached || hidden) return;
    if (userMessageCount >= AI_HELPER_MAX_USER_MESSAGES) return;

    const msg = input.trim();
    const nextHistory: UiMessage[] = [...messages, { role: "user", text: msg }];
    const isLastTurn = userMessageCount + 1 >= AI_HELPER_MAX_USER_MESSAGES;

    const ok = await requestReply(nextHistory);
    if (!ok) return;

    setInput("");
    const isLastTurnAfterReply = isLastTurn;
    if (isLastTurnAfterReply) {
      finishWithFarewell();
    }
  }

  if (hidden) {
    return null;
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
              onClick={handleCloseChat}
              className="rounded-pill p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="닫기"
            >
              <X className={iconSm} />
            </button>
          </div>
          <div
            ref={scrollRef}
            className="koala-scrollbar min-h-0 flex-1 overflow-y-auto bg-koala-bg/50 p-3"
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
          </div>
          <div className="border-t border-koala-secondary/30 p-2">
            {inputError && <p className="mb-2 px-1 text-xs text-red-500">{inputError}</p>}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (inputError) setInputError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="생각나는 말을 적어 보세요"
                disabled={loading || limitReached}
                className="koala-input flex-1 py-2 text-sm disabled:opacity-50"
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || limitReached}
                className="koala-btn-primary inline-flex items-center justify-center p-2.5 disabled:opacity-50"
                aria-label="전송"
              >
                <Send className={iconSm} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
