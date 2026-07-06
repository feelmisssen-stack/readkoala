"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/admin"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) return;
    if (isLoading) return;
    if (!user) {
      window.location.href = "/";
    }
  }, [pathname, user, isLoading]);

  return children;
}
