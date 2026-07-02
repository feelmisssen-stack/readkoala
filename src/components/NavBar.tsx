"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Library, User } from "lucide-react";

const links = [
  { href: "/", label: "홈" },
  { href: "/books", label: "내 책장" },
  { href: "/chat", label: "도란뜰" },
  { href: "/dictionary", label: "낱말집" },
];

export function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string; displayName?: string } | null>(null);
  const [isGoogleAdmin, setIsGoogleAdmin] = useState(false);

  useEffect(() => {
    function loadUser() {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((d) => setUser(d.user || null))
        .catch(() => setUser(null));
    }

    loadUser();
    window.addEventListener("auth-changed", loadUser);
    return () => window.removeEventListener("auth-changed", loadUser);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsGoogleAdmin(!!d.admin))
      .catch(() => setIsGoogleAdmin(false));
  }, [pathname]);

  if (pathname === "/admin") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-koala-secondary/60 bg-koala-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-koala-heading">
          <Library className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          도란서재
        </Link>

        {user && (
          <>
            <nav className="hidden items-center gap-1 sm:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-pill px-3 py-1.5 text-sm transition-colors ${
                    pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"))
                      ? "bg-koala-primary text-white"
                      : "text-koala-muted hover:bg-koala-secondary/50"
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
                      : "text-koala-muted hover:bg-koala-secondary/50"
                  }`}
                >
                  관리자
                </Link>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                title="회원 정보"
                aria-label="회원 정보 수정"
                className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-sm text-koala-muted transition-opacity hover:opacity-80"
              >
                <User className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <span>{(user.displayName || user.username) + "님"}</span>
              </Link>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.dispatchEvent(new Event("auth-changed"));
                  window.location.href = "/";
                }}
                className="koala-btn-secondary text-sm"
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>

      {user && (
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-pill px-3 py-1 text-xs ${
                pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"))
                  ? "bg-koala-primary text-white"
                  : "bg-koala-secondary/30"
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
      )}
    </header>
  );
}
