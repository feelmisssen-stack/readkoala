"use client";

import { useEffect, useState, use, useRef } from "react";
import { BackLink } from "@/components/BackLink";
import { CHAT_MESSAGE_LIMIT_PER_USER } from "@/lib/chat";

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [myMessageCount, setMyMessageCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function loadMessages() {
    fetch(`/api/chat/rooms/${id}/messages`)
      .then((r) => {
        if (r.status === 404) {
          setError("이야기뜰을 찾을 수 없어요.");
          return null;
        }
        if (r.status === 401) {
          window.location.href = "/";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setError("");
        setMessages(d.messages || []);
        if (d.currentUserId) setCurrentUserId(d.currentUserId);
        if (d.currentUsername) setCurrentUsername(d.currentUsername);
        if (typeof d.myMessageCount === "number") setMyMessageCount(d.myMessageCount);
      });
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setCurrentUserId(d.user?.id ?? null);
      });

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const atMessageLimit = myMessageCount >= CHAT_MESSAGE_LIMIT_PER_USER;

  async function send() {
    const text = content.trim();
    if (!text || atMessageLimit) return;

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      userId: currentUserId || "",
      username: currentUsername || "나",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setContent("");
    setMessages((prev) => [...prev, optimistic]);

    const res = await fetch(`/api/chat/rooms/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setContent(text);
      setError(data.error || "메시지를 보낼 수 없어요.");
      return;
    }
    loadMessages();
  }

  function isMyMessage(m: Message) {
    if (currentUserId && m.userId === currentUserId) return true;
    if (currentUsername && m.username === currentUsername) return true;
    return false;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <BackLink href="/chat">이야기뜰 목록</BackLink>

      {error && (
        <div className="mb-3 rounded-koala bg-koala-accent/20 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="koala-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto bg-koala-bg/50 p-4"
        >
          <div className="space-y-3">
            {messages.map((m) =>
              isMyMessage(m) ? (
                <div key={m.id} className="w-full">
                  <div className="ml-auto max-w-[85%] w-fit rounded-koala rounded-br-sm bg-koala-primary px-3 py-2 text-sm text-white whitespace-pre-wrap shadow-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="w-full">
                  <p className="mb-1 px-1 text-xs font-medium text-koala-primary">{m.username}</p>
                  <div className="max-w-[85%] w-fit rounded-koala rounded-bl-sm bg-koala-card px-3 py-2 text-sm text-koala-text whitespace-pre-wrap shadow-sm ring-1 ring-koala-secondary/30">
                    {m.content}
                  </div>
                </div>
              )
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-col gap-2 border-t border-koala-secondary/30 bg-koala-card p-3">
          {atMessageLimit && (
            <p className="text-xs text-koala-muted">
              이 이야기뜰에는 {CHAT_MESSAGE_LIMIT_PER_USER}번까지 글을 남길 수 있어요.
            </p>
          )}
          <div className="flex gap-2">
            <input
              className="koala-input flex-1 py-2 text-sm disabled:opacity-60"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="이야기를 나눠보세요. 최대 5번까지 입력할 수 있어요."
              disabled={atMessageLimit}
            />
            <button
              type="button"
              onClick={send}
              disabled={atMessageLimit || !content.trim()}
              className="koala-btn-primary px-4 text-sm disabled:opacity-60"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
