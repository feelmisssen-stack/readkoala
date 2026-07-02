"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CarouselMoment } from "@/lib/types";

const ROTATE_MS = 4000;

function PersonalMomentText({ moment }: { moment: CarouselMoment }) {
  if (moment.kind === "memorable_scene" && moment.imageUrl) {
    return (
      <div className="relative mx-auto aspect-[4/3] max-h-32 w-full max-w-[200px] overflow-hidden rounded-lg">
        <Image
          src={moment.imageUrl}
          alt="기억에 남는 장면"
          fill
          className="object-contain"
          sizes="200px"
          unoptimized
        />
      </div>
    );
  }

  if (!moment.text) return null;

  const isQuestion =
    moment.kind === "before_question" || moment.kind === "during_question";

  return (
    <p
      className={`text-sm leading-relaxed transition-opacity duration-500 ${
        isQuestion ? "line-clamp-4 font-medium text-koala-primary" : "line-clamp-4 text-koala-text"
      }`}
    >
      {moment.text}
    </p>
  );
}

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
        if (d.user?.displayName || d.user?.username) setUsername(d.user.displayName || d.user.username);
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
        <h2 className="text-sm font-display text-koala-heading">
          {username ? `${username}의 기록` : "나의 기록"}
        </h2>
        <Link href="/books" className="text-xs text-koala-muted underline hover:text-koala-primary">
          내 책장 보기
        </Link>
      </div>

      {current ? (
        <div className="min-h-[4.5rem]">
          <PersonalMomentText moment={current} />
          {current.bookTitle && (
            <p className="mt-1 text-xs text-koala-muted">{current.bookTitle}</p>
          )}
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
