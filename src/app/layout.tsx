import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { AuthGate } from "@/components/AuthGate";

const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "도란서재",
  description: "작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${notoSerif.variable} min-h-screen`}>
        <NavBar />
        <AuthGate>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </AuthGate>
      </body>
    </html>
  );
}
