"use client";

import { useCallback, useEffect, useState } from "react";

interface AiHelperMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface AiHelperSessionCard {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  bookId?: string;
  bookTitle?: string;
  messages: AiHelperMessage[];
  createdAt: string;
  updatedAt: string;
}

export function AdminAiHelperTab() {
  const [sessions, setSessions] = useState<AiHelperSessionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSessions = useCallback(() => {
    setLoading(true);
    return fetch("/api/admin/ai-helper-sessions")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setError("기록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  if (loading) {
    return <p className="text-sm text-koala-muted">불러오는 중...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-koala-primary">감상문 도우미 기록</h2>
        <p className="mt-1 text-sm text-koala-muted">
          학생과 감상문 도우미의 대화 기록을 확인할 수 있어요.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {sessions.length === 0 ? (
        <div className="koala-card p-8 text-center text-sm text-koala-muted">
          아직 저장된 대화가 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <article key={session.id} className="koala-card flex h-full flex-col space-y-4 p-5">
              <div>
                <p className="font-medium text-koala-primary">
                  {session.nickname} ({session.username})
                </p>
                {session.bookTitle && (
                  <p className="text-sm text-koala-muted">책: {session.bookTitle}</p>
                )}
                <p className="mt-1 text-xs text-koala-muted">
                  마지막 대화: {new Date(session.updatedAt).toLocaleString("ko-KR")}
                </p>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto">
                {session.messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={`rounded-koala p-3 text-sm ${
                      message.role === "user"
                        ? "bg-koala-primary/10"
                        : "bg-koala-secondary/20"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold text-koala-muted">
                      {message.role === "user" ? "학생" : "감상문 도우미"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
