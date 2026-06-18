"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "홈" },
  { href: "/books", label: "내 책장" },
  { href: "/chat", label: "도란뜰" },
  { href: "/dictionary", label: "낱말집" },
];

export function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isGoogleAdmin, setIsGoogleAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));

    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsGoogleAdmin(!!d.admin))
      .catch(() => setIsGoogleAdmin(false));
  }, [pathname]);

  const hideOnAuth =
    pathname === "/login" || pathname === "/register" || pathname === "/admin";

  if (hideOnAuth) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-koala-secondary/30 bg-koala-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-koala-primary">
          도란서재
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-pill px-3 py-1.5 text-sm transition-colors ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-koala-primary text-white"
                  : "text-koala-muted hover:bg-koala-secondary/30"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isGoogleAdmin && (
            <Link
              href="/admin"
              className={`rounded-pill px-3 py-1.5 text-sm transition-colors ${
                pathname === "/admin"
                  ? "bg-koala-primary text-white"
                  : "text-koala-muted hover:bg-koala-secondary/30"
              }`}
            >
              관리자
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-koala-muted sm:inline">{user.username}님</span>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="koala-btn-secondary text-sm"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login" className="koala-btn-primary text-sm">
              로그인
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-pill px-3 py-1 text-xs ${
              pathname === l.href ? "bg-koala-primary text-white" : "bg-koala-secondary/30"
            }`}
          >
            {l.label}
          </Link>
        ))}
        {isGoogleAdmin && (
          <Link
            href="/admin"
            className={`shrink-0 rounded-pill px-3 py-1 text-xs ${
              pathname === "/admin" ? "bg-koala-primary text-white" : "bg-koala-secondary/30"
            }`}
          >
            관리자
          </Link>
        )}
      </nav>
    </header>
  );
}
