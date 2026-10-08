import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
  outputFileTracingIncludes: {
    "/api/legal/\\[doc\\]": ["./이용약관.md", "./개인정보처리방침.md"],
    "/api/koala/generate": ["./public/images/koala-stages/koala-lv10.png"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http", hostname: "books.google.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "http", hostname: "data4library.kr" },
      { protocol: "https", hostname: "data4library.kr" },
      { protocol: "https", hostname: "search1.kakaocdn.net" },
      { protocol: "https", hostname: "t1.daumcdn.net" },
      { protocol: "https", hostname: "image.aladin.co.kr" },
      { protocol: "http", hostname: "image.aladin.co.kr" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};

export default nextConfig;
