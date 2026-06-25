"use client";

import { use, useEffect, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { BookStoryView } from "@/components/BookStoryView";
import type { PublicStorySection } from "@/lib/reflection-public-view";

interface StoryResponse {
  username: string;
  book: {
    id: string;
    title: string;
    author?: string;
    publisher?: string;
    coverUrl?: string;
    readingProgress: number;
    currentPage?: number;
    totalPages?: number;
    createdAt: string;
    updatedAt: string;
    finishedAt?: string;
  };
  sections: PublicStorySection[];
}

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/feed/story/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.story) {
          setError(data.error || "기록을 불러오지 못했어요.");
          return;
        }
        setStory(data.story);
      })
      .catch(() => setError("기록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-center text-koala-muted">독서 기록을 불러오는 중...</p>;
  }

  if (error || !story) {
    return (
      <div className="space-y-4">
        <BackLink href="/">홈으로</BackLink>
        <p className="text-center text-koala-muted">{error || "기록을 찾을 수 없어요."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/">홈으로</BackLink>
      <BookStoryView
        storyId={id}
        bookId={story.book.id}
        username={story.username}
        book={story.book}
        sections={story.sections}
      />
    </div>
  );
}
