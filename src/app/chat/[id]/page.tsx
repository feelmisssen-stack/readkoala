"use client";

import { useEffect, useState, use, useRef } from "react";
import { Heart, Send } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { CHAT_MESSAGE_LIMIT_PER_USER, CHAT_SPEAKER_LIMIT } from "@/lib/chat";
import { warnIfInvalidContent, alertContentFilterApiError } from "@/lib/content-filter-client";
import { iconSm } from "@/lib/icon-styles";

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  heartCount: number;
  heartedByMe: boolean;
}

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [myMessageCount, setMyMessageCount] = useState(0);
  const [canChat, setCanChat] = useState(true);
  const [speakerCount, setSpeakerCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
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
        if (typeof d.canChat === "boolean") setCanChat(d.canChat);
        if (typeof d.speakerCount === "number") setSpeakerCount(d.speakerCount);
        if (d.room?.name) setRoomName(d.room.name);
        if (d.room?.bookTitle) setBookTitle(d.room.bookTitle);
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

  function countMyMessagesFromList(list: Message[]) {
    if (!currentUserId) return 0;
    return list.filter((m) => m.userId === currentUserId && !m.id.startsWith("temp-")).length;
  }

  function countSpeakersFromList(list: Message[]) {
    const speakers = new Set<string>();
    for (const m of list) {
      if (!m.id.startsWith("temp-")) speakers.add(m.userId);
    }
    return speakers;
  }

  function canChatFromList(list: Message[]) {
    if (!currentUserId) return canChat;
    const speakers = countSpeakersFromList(list);
    return speakers.has(currentUserId) || speakers.size < CHAT_SPEAKER_LIMIT;
  }

  const localMessageCount = Math.max(myMessageCount, countMyMessagesFromList(messages));
  const atMessageLimit = localMessageCount >= CHAT_MESSAGE_LIMIT_PER_USER;
  const canSendChat = canChat && canChatFromList(messages);

  const SPEAKER_LIMIT_MESSAGE = `이 이야기뜰은 ${CHAT_SPEAKER_LIMIT}명까지 대화할 수 있어요. 들어는 볼 수 있지만 글은 남길 수 없어요.`;
  const MESSAGE_LIMIT_MESSAGE = `이 이야기뜰에는 ${CHAT_MESSAGE_LIMIT_PER_USER}번까지만 글을 남길 수 있어요. 이야기 횟수가 초과되었어요.`;

  function showNotice(message: string) {
    setNotice(message);
  }

  async function send() {
    const text = content.trim();
    if (!text) return;

    if (!canSendChat) {
      showNotice(SPEAKER_LIMIT_MESSAGE);
      setCanChat(false);
      return;
    }

    if (atMessageLimit) {
      showNotice(MESSAGE_LIMIT_MESSAGE);
      return;
    }

    if (!warnIfInvalidContent(text).ok) return;

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      userId: currentUserId || "",
      username: currentUsername || "나",
      content: text,
      createdAt: new Date().toISOString(),
      heartCount: 0,
      heartedByMe: false,
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
      if (res.status === 403) {
        showNotice(SPEAKER_LIMIT_MESSAGE);
        setCanChat(false);
      } else if (
        res.status === 400 &&
        typeof data.error === "string" &&
        data.error.includes("번까지만")
      ) {
        showNotice(MESSAGE_LIMIT_MESSAGE);
        setMyMessageCount(CHAT_MESSAGE_LIMIT_PER_USER);
      } else if (res.status === 400 && typeof data.error === "string") {
        if (alertContentFilterApiError(res, data)) return;
        setError(data.error);
      } else {
        setError(data.error || "메시지를 보낼 수 없어요.");
      }
      return;
    }
    loadMessages();
  }

  async function toggleHeart(messageId: string) {
    const res = await fetch(`/api/chat/rooms/${id}/messages/${messageId}/heart`, {
      method: "POST",
    });
    if (!res.ok) return;
    const data = await res.json();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, heartCount: data.heartCount, heartedByMe: data.hearted }
          : m
      )
    );
  }

  function isMyMessage(m: Message) {
    if (currentUserId && m.userId === currentUserId) return true;
    if (currentUsername && m.username === currentUsername) return true;
    return false;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {notice && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-notice-title"
        >
          <div className="koala-card w-full max-w-sm p-6">
            <p id="chat-notice-title" className="text-sm leading-relaxed text-koala-text">
              {notice}
            </p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="koala-btn-primary mt-5 w-full text-sm"
            >
              확인
            </button>
          </div>
        </div>
      )}

      <BackLink href="/chat">이야기뜰 목록</BackLink>

      {error && (
        <div className="mb-3 rounded-koala bg-koala-accent/20 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="koala-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-koala-primary/15 bg-koala-secondary/20 px-4 py-3">
          {(roomName || bookTitle) && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {roomName && (
                <h1 className="text-base font-display text-koala-heading sm:text-lg">{roomName}</h1>
              )}
              {roomName && bookTitle && (
                <span className="text-xs text-koala-muted/60" aria-hidden>
                  ·
                </span>
              )}
              {bookTitle && (
                <span className="text-xs text-koala-muted sm:text-sm">{bookTitle}</span>
              )}
            </div>
          )}
          <p className="mt-2 text-xs leading-relaxed text-koala-muted">
            한 번 입력한 내용은 지워지지 않으니 사이버 예절을 지켜요. 이 이야기뜰에는{" "}
            {CHAT_MESSAGE_LIMIT_PER_USER}번까지 글을 남길 수 있어요.
          </p>
        </div>
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto bg-koala-bg/50 p-4"
        >
          <div className="space-y-3">
            {messages.map((m) =>
              isMyMessage(m) ? (
                <div key={m.id} className="w-full">
                  <div className="ml-auto max-w-[85%] w-fit rounded-koala rounded-br-sm bg-koala-primary px-3 py-2 text-sm text-white whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="w-full">
                  <p className="mb-1 px-1 text-xs font-medium text-koala-primary">{m.username}</p>
                  <div className="flex max-w-[85%] items-end gap-1.5">
                    <div className="max-w-full w-fit rounded-koala rounded-bl-sm bg-koala-bg px-3 py-2 text-sm text-koala-text whitespace-pre-wrap ring-1 ring-koala-secondary/50">
                      {m.content}
                    </div>
                    {!m.id.startsWith("temp-") && (
                      <button
                        type="button"
                        onClick={() => toggleHeart(m.id)}
                        className={`flex shrink-0 items-center gap-0.5 rounded-pill px-2 py-1 text-xs transition ${
                          m.heartedByMe
                            ? "bg-koala-accent/20 text-koala-accent"
                            : "text-koala-muted hover:bg-koala-secondary/25"
                        }`}
                        aria-label="호응 남기기"
                      >
                        <Heart
                          className={iconSm}
                          fill={m.heartedByMe ? "currentColor" : "none"}
                          aria-hidden
                        />
                        {m.heartCount > 0 && <span>{m.heartCount}</span>}
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-col gap-2 border-t border-koala-secondary/30 bg-koala-card p-3">
          <div className="flex gap-2">
            <input
              className="koala-input flex-1 py-2 text-sm disabled:opacity-60"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="이야기를 나눠보세요. 전송 버튼을 눌러 보내요."
            />
            <button
              type="button"
              onClick={send}
              disabled={!content.trim()}
              className="koala-btn-primary flex size-10 shrink-0 items-center justify-center p-0 disabled:opacity-60"
              aria-label="전송"
            >
              <Send className={iconSm} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
