"use client";

import { bookTopicLabel } from "@/lib/reflection-templates";

interface AssociationInputProps {
  bookTitle?: string;
  value: string;
  onChange: (value: string) => void;
}

export function AssociationInput({ bookTitle, value, onChange }: AssociationInputProps) {
  return (
    <div>
      <p className="koala-label">예) 피노키오는 거짓말 할 때 생각나는 책이다</p>
      <div className="koala-input mt-2 flex min-h-[100px] items-start gap-0 p-3">
        <span className="shrink-0 whitespace-pre-wrap text-koala-primary">
          {bookTitle ? bookTopicLabel(bookTitle) : "이 책은"}{" "}
        </span>
        <textarea
          className="min-h-[76px] w-full flex-1 resize-y border-0 bg-transparent p-0 text-koala-text outline-none focus:ring-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="OO할 때 생각나는 책이다"
          rows={3}
        />
      </div>
    </div>
  );
}
