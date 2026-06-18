"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FriendFeedMosaic } from "@/components/FriendFeedMosaic";
import { MyReadingRecord } from "@/components/MyReadingRecord";

export default function HomePage() {
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-bold text-koala-primary">도란서재</h1>
        <p className="mt-2 text-koala-muted">
          작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳
        </p>
      </section>

      <FriendFeedMosaic />

      {user ? (
        <MyReadingRecord />
      ) : (
        <div className="koala-card p-5 text-center">
          <p className="text-sm text-koala-muted">로그인하면 나만의 독서 기록을 모아 볼 수 있어요.</p>
          <div className="mt-3 flex justify-center gap-3">
            <Link href="/login" className="koala-btn-primary text-sm">
              로그인
            </Link>
            <Link href="/register" className="koala-btn-secondary text-sm">
              회원가입
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
