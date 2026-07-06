"use client";

import { AuthGate } from "@/components/AuthGate";
import { ClipboardBlocker } from "@/components/ClipboardBlocker";
import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/contexts/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClipboardBlocker />
      <NavBar />
      <AuthGate>
        <div className="flex flex-1 flex-col">
          <main className="mx-auto flex w-full min-w-0 max-w-content flex-1 flex-col overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8">
            {children}
          </main>
          <SiteFooter />
        </div>
      </AuthGate>
    </AuthProvider>
  );
}
