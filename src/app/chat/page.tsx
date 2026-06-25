"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Users } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";
import type { Book } from "@/lib/types";

interface ChatRoom {
  id: string;
  bookTitle: string;
  name: string;
  participants: string[];
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
          window.location.href = "/";
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
        <h1 className="text-2xl font-bold text-koala-primary">도란뜰</h1>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="koala-btn-primary inline-flex items-center gap-1.5 text-sm">
          <Plus className={iconSm} aria-hidden />
          이야기뜰 만들기
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
            placeholder="이야기 주제"
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
                <p className="inline-flex items-center gap-1 text-sm text-koala-muted">
                  <BookOpen className={iconSm} aria-hidden />
                  {room.bookTitle}
                </p>
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
          아직 열린 이야기뜰이 없어요.
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
              <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-koala-muted">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className={iconSm} aria-hidden />
                  {room.bookTitle}
                </span>
                {room.participants.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className={iconSm} aria-hidden />
                    {room.participants.join(", ")} 참여
                  </span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
