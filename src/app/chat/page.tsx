"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/types";

interface ChatRoom {
  id: string;
  bookTitle: string;
  name: string;
  memberCount: number;
  membership?: { status: string };
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [pendingRooms, setPendingRooms] = useState<ChatRoom[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");

  function load() {
    fetch("/api/chat/rooms")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setRooms(d.rooms || []);
        setPendingRooms(d.pendingRooms || []);
      });

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.user?.isAdmin));

    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => setBooks(d.books || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createRoom() {
    if (!selectedBookId) return;
    const res = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: selectedBookId, name: newRoomName }),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewRoomName("");
      load();
    }
  }

  async function approveRoom(id: string, action: "approve" | "reject") {
    await fetch(`/api/chat/rooms/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-koala-primary">책 이야기방</h1>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="koala-btn-primary text-sm">
          + 방 만들기
        </button>
      </div>

      {showCreate && (
        <div className="koala-card space-y-3 p-5">
          <select
            className="koala-input"
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            <option value="">책 선택</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <input
            className="koala-input"
            placeholder="방 이름 (선택)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button type="button" onClick={createRoom} className="koala-btn-accent text-sm">
            만들기 (관리자 승인 필요)
          </button>
        </div>
      )}

      {isAdmin && pendingRooms.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-koala-accent">승인 대기 방 (관리자)</h2>
          {pendingRooms.map((room) => (
            <div key={room.id} className="koala-card flex items-center justify-between p-4">
              <div>
                <p className="font-bold">{room.name}</p>
                <p className="text-sm text-koala-muted">📖 {room.bookTitle}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => approveRoom(room.id, "approve")}
                  className="koala-btn-primary text-sm"
                >
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => approveRoom(room.id, "reject")}
                  className="koala-btn-secondary text-sm"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="koala-card p-8 text-center text-koala-muted">
          아직 열린 이야기방이 없어요.
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="koala-card block p-4 transition hover:shadow-md"
            >
              <h2 className="font-bold text-koala-primary">{room.name}</h2>
              <p className="text-sm text-koala-muted">
                📖 {room.bookTitle} · 👥 {room.memberCount}명
                {room.membership?.status === "pending" && " · 승인 대기 중"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
