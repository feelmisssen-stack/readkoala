import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { AuthGate } from "@/components/AuthGate";
import { ClipboardBlocker } from "@/components/ClipboardBlocker";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "도란서재",
  description: "작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="font-reading">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-reading flex min-h-screen flex-col">
        <ClipboardBlocker />
        <NavBar />
        <AuthGate>
          <div className="flex flex-1 flex-col">
            <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-4 py-8">
              {children}
            </main>
            <SiteFooter />
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
