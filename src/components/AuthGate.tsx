"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = new Set(["/", "/login", "/admin"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) return;

    function redirectIfLoggedOut() {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((d) => {
          if (!d.user) {
            window.location.href = "/";
          }
        })
        .catch(() => {
          window.location.href = "/";
        });
    }

    redirectIfLoggedOut();
    window.addEventListener("auth-changed", redirectIfLoggedOut);
    return () => window.removeEventListener("auth-changed", redirectIfLoggedOut);
  }, [pathname]);

  return children;
}
