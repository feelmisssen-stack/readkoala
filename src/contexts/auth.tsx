"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AppUser {
  id: string;
  username: string;
  nickname?: string;
  displayName?: string;
  isAdmin?: boolean;
  readOnly?: boolean;
  stageLevel?: number;
  stats?: {
    booksRead: number;
    totalChars: number;
    chatParticipations: number;
    level: number;
  };
}

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isGoogleAdmin: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleAdmin, setIsGoogleAdmin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [authRes, adminRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "same-origin" }),
        fetch("/api/admin/me", { credentials: "same-origin" }),
      ]);
      const authData = (await authRes.json()) as { user?: AppUser | null };
      const adminData = (await adminRes.json()) as { admin?: unknown };
      setUser(authData.user ?? null);
      setIsGoogleAdmin(Boolean(adminData.admin));
    } catch {
      setUser(null);
      setIsGoogleAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onAuthChanged = () => {
      void refresh();
    };
    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isGoogleAdmin, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
