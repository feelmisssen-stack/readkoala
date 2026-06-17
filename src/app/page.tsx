"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RandomFeedBanner } from "@/components/RandomFeedBanner";
import { KoalaCharacter } from "@/components/KoalaCharacter";
import type { UserStats } from "@/lib/types";

export default function HomePage() {
  const [user, setUser] = useState<{ username: string; stats: UserStats } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-bold text-koala-primary">ReadKoala</h1>
        <p className="mt-2 text-koala-muted">책을 읽고, 생각을 나누고, 코알라와 함께 자라요</p>
      </section>

      <RandomFeedBanner />

      {user ? (
        <KoalaCharacter stats={user.stats} />
      ) : (
        <div className="koala-card p-8 text-center">
          <div className="text-6xl">🐨</div>
          <p className="mt-3 text-koala-muted">로그인하면 나만의 코알라가 자라요!</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/login" className="koala-btn-primary">
              로그인
            </Link>
            <Link href="/register" className="koala-btn-secondary">
              회원가입
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/books/new" className="koala-card block p-5 transition hover:shadow-md">
          <span className="text-2xl">📚</span>
          <h2 className="mt-2 font-bold text-koala-primary">책 등록하기</h2>
          <p className="text-sm text-koala-muted">검색하거나 ISBN으로 책을 추가해요</p>
        </Link>
        <Link href="/reflections/new" className="koala-card block p-5 transition hover:shadow-md">
          <span className="text-2xl">✏️</span>
          <h2 className="mt-2 font-bold text-koala-primary">감상 쓰기</h2>
          <p className="text-sm text-koala-muted">읽기 전·중·후 생각을 기록해요</p>
        </Link>
      </div>
    </div>
  );
}
