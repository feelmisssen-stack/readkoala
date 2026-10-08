import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";

export function BackLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-koala-muted transition hover:text-koala-primary"
    >
      <ChevronLeft className={iconSm} aria-hidden />
      {children}
    </Link>
  );
}
