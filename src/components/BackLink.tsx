import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-koala-muted transition hover:text-koala-primary"
    >
      <ChevronLeft className={iconSm} aria-hidden />
      {children}
    </Link>
  );
}
