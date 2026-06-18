import { BookOpen } from "lucide-react";
import { iconLg, iconMd } from "@/lib/icon-styles";

export function BookCoverPlaceholder({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-koala-secondary/20 text-koala-muted">
      <BookOpen className={size === "lg" ? iconLg : iconMd} strokeWidth={1.5} aria-hidden />
    </div>
  );
}
