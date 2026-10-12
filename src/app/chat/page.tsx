"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Trash2, Users } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";
import { formatChatMessageTime } from "@/lib/chat";
import { alertContentFilterApiError } from "@/lib/content-filter-client";
import type { Book } from "@/lib/types";

interface ChatRoom {
  id: string;
  bookTitle: string;
  name: string;
  participants: string[];
  creatorName?: string | null;
  createdAt?: string;
  membership?: { status: string };
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ChatRoom | null>(null);

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
        setCanDelete(Boolean(d.canDelete));
      });

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
    if (!res.ok) {
      const data = await res.json();
      alertContentFilterApiError(res, data);
      return;
    }
    if (res.ok) {
      setShowCreate(false);
      setNewRoomName("");
      load();
    }
  }

  function confirmDelete() {
    if (!deleteConfirm) return;
    const room = deleteConfirm;
    setDeleteConfirm(null);
    void deleteRoom(room);
  }

  async function deleteRoom(room: ChatRoom) {
    setDeletingId(room.id);
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "이야기뜰을 지우지 못했어요.");
        return;
      }
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-delete-title"
        >
          <div className="koala-card w-full max-w-sm p-6">
            <p id="room-delete-title" className="font-display text-koala-heading">
              이야기뜰을 지울까요?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-koala-text">
              「{deleteConfirm.name}」 이야기뜰을 지우면 안에 남긴 이야기도 모두 함께 지워지고 되돌릴 수
              없어요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="koala-btn-secondary flex-1 text-sm"
                autoFocus
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="koala-btn flex-1 bg-red-500 text-sm text-white hover:bg-red-600"
              >
                지울래요
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display text-koala-heading">도란뜰</h1>
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
            만들기
          </button>
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="koala-card p-8 text-center text-koala-muted">
          아직 열린 이야기뜰이 없어요.
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="koala-card relative p-4 transition hover:bg-koala-secondary/30"
            >
              <Link
                href={`/chat/${room.id}`}
                className="absolute inset-0 z-0 rounded-koala"
                aria-label={`${room.name} 이야기뜰 들어가기`}
              />
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(room)}
                  disabled={deletingId === room.id}
                  aria-label={deletingId === room.id ? "지우는 중" : "이야기뜰 지우기"}
                  title="이야기뜰 지우기 (관리자)"
                  className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-pill bg-koala-card/90 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
              <div className={`pointer-events-none relative z-[1] ${canDelete ? "pr-8" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 className="font-display text-koala-heading">{room.name}</h2>
                  {room.creatorName && (
                    <span className="text-xs text-koala-primary">{room.creatorName}</span>
                  )}
                  {room.createdAt && (
                    <span className="text-[11px] text-koala-muted">
                      {formatChatMessageTime(room.createdAt)}
                    </span>
                  )}
                </div>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
