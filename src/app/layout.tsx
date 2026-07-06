import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { notoSerifKr } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "도란서재",
  description: "작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSerifKr.variable} font-reading`}>
      <body className={`${notoSerifKr.className} font-reading flex min-h-screen flex-col`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
