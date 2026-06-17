"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";

interface Message {
  id: string;
  username: string;
  content: string;
  createdAt: string;
}

interface PendingMember {
  id: string;
  userId: string;
}

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadMessages() {
    fetch(`/api/chat/rooms/${id}/messages`)
      .then((r) => {
        if (r.status === 403) {
          setError("참여 승인 후 입장할 수 있어요.");
          return null;
        }
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setMessages(d.messages || []);
        setPendingMembers(d.pendingMembers || []);
      });
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.user?.isAdmin));

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function join() {
    await fetch(`/api/chat/rooms/${id}/join`, { method: "POST" });
    setError("참여 신청했어요. 관리자 승인을 기다려 주세요.");
  }

  async function send() {
    if (!content.trim()) return;
    const res = await fetch(`/api/chat/rooms/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "메시지를 보낼 수 없어요.");
      return;
    }
    setContent("");
    loadMessages();
  }

  async function approveMember(membershipId: string, action: "approve" | "reject") {
    await fetch("/api/chat/memberships/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, action }),
    });
    loadMessages();
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <Link href="/chat" className="mb-3 text-sm text-koala-muted hover:text-koala-primary">
        ← 이야기방 목록
      </Link>

      {error && (
        <div className="mb-3 rounded-koala bg-koala-accent/20 p-3 text-sm">
          {error}
          <button type="button" onClick={join} className="ml-2 underline">
            참여 신청
          </button>
        </div>
      )}

      {isAdmin && pendingMembers.length > 0 && (
        <div className="mb-3 koala-card p-3 text-sm">
          <p className="font-medium">승인 대기 참여자</p>
          {pendingMembers.map((m) => (
            <div key={m.id} className="mt-2 flex gap-2">
              <button type="button" onClick={() => approveMember(m.id, "approve")} className="koala-btn-primary px-2 py-1 text-xs">
                승인
              </button>
              <button type="button" onClick={() => approveMember(m.id, "reject")} className="koala-btn-secondary px-2 py-1 text-xs">
                거절
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="koala-card flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className="rounded-koala bg-koala-secondary/20 p-3">
            <span className="text-xs font-medium text-koala-primary">{m.username}</span>
            <p className="mt-1 text-sm">{m.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="koala-input flex-1"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="이야기를 나눠 보세요"
        />
        <button type="button" onClick={send} className="koala-btn-primary">
          전송
        </button>
      </div>
    </div>
  );
}
