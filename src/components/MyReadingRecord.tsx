"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CarouselMoment } from "@/lib/types";

const ROTATE_MS = 4000;

export function MyReadingRecord() {
  const [moments, setMoments] = useState<CarouselMoment[]>([]);
  const [index, setIndex] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch("/api/feed/carousel")
      .then((r) => r.json())
      .then((d) => {
        setMoments(d.personalMoments || []);
      })
      .catch(() => setMoments([]));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.username) setUsername(d.user.username);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (moments.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % moments.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [moments.length]);

  const current = moments[index];

  return (
    <section className="koala-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-koala-primary">
          {username ? `${username}의 기록` : "나의 기록"}
        </h2>
        <Link href="/books" className="text-xs text-koala-muted underline hover:text-koala-primary">
          내 책장 보기
        </Link>
      </div>

      {current ? (
        <div className="min-h-[4.5rem]">
          <span className="text-xs text-koala-accent">{current.label}</span>
          <p className="mt-1 text-sm leading-relaxed text-koala-text transition-opacity duration-500">
            &ldquo;{current.text}&rdquo;
          </p>
          {moments.length > 1 && (
            <div className="mt-2 flex gap-1">
              {moments.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? "w-4 bg-koala-primary" : "w-1 bg-koala-secondary/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-koala-muted">
          아직 남긴 기록이 없어요.{" "}
          <Link href="/books" className="text-koala-primary underline">
            책을 읽고 감상을 써 보세요
          </Link>
        </p>
      )}
    </section>
  );
}
