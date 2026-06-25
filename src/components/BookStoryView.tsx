import Image from "next/image";
import { BookCoverPlaceholder } from "@/components/BookCoverPlaceholder";
import { ReadingStatusBadgeFromBook } from "@/components/ReadingStatusBadge";
import { StoryEmpathyPanel } from "@/components/StoryEmpathyPanel";
import { SECTION_ICONS } from "@/lib/section-icons";
import { iconMd } from "@/lib/icon-styles";
import type { PublicStorySection } from "@/lib/reflection-public-view";

interface BookStoryViewProps {
  storyId: string;
  bookId: string;
  username: string;
  book: {
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

export function BookStoryView({ storyId, bookId, username, book, sections }: BookStoryViewProps) {
  return (
    <div className="space-y-6">
      <div className="koala-card flex flex-col gap-6 p-6 sm:flex-row">
        <div className="relative mx-auto h-56 w-40 shrink-0 overflow-hidden rounded-koala-lg bg-koala-secondary/20 sm:mx-0">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <BookCoverPlaceholder size="lg" />
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute right-0 top-0">
            <StoryEmpathyPanel bookId={bookId} storyId={storyId} />
          </div>
          <p className="pr-28 text-sm text-koala-muted">{username}</p>
          <h1 className="mt-1 pr-4 text-2xl font-bold text-koala-primary">{book.title}</h1>
          {book.author && <p className="mt-1 text-koala-muted">{book.author}</p>}
          {book.publisher && <p className="text-sm text-koala-muted">{book.publisher}</p>}
          <div className="mt-4">
            <ReadingStatusBadgeFromBook
              readingProgress={book.readingProgress}
              currentPage={book.currentPage ?? 0}
              totalPages={book.totalPages}
              createdAt={book.createdAt}
              updatedAt={book.updatedAt}
              finishedAt={book.finishedAt}
            />
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-koala-primary">독서 기록</h2>
        {sections.length === 0 ? (
          <div className="koala-card p-6 text-sm text-koala-muted">
            아직 공유할 독서 기록이 없어요.
          </div>
        ) : (
          sections.map((section) => {
            const Icon = SECTION_ICONS[section.section];
            return (
              <article key={section.section} className="koala-card space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Icon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
                  <h3 className="font-bold text-koala-primary">{section.title}</h3>
                </div>

                {section.readingQuestions && (
                  <ul className="space-y-3">
                    {section.readingQuestions.map((item, index) => (
                      <li
                        key={`${section.section}-${index}`}
                        className="rounded-koala bg-koala-secondary/10 px-4 py-3 text-sm"
                      >
                        <p className="whitespace-pre-line text-koala-text">{item.question}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {section.text && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-koala-text">
                    {section.text}
                  </p>
                )}

                {section.reviewFields && (
                  <div className="space-y-3">
                    {section.reviewFields.map((field) => (
                      <div key={field.label}>
                        <p className="text-xs font-medium text-koala-muted">{field.label}</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-koala-text">
                          {field.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {section.imageUrl && (
                  <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-koala-lg bg-koala-secondary/15">
                    <Image
                      src={section.imageUrl}
                      alt="기억에 남는 장면"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
