import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http", hostname: "books.google.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "http", hostname: "data4library.kr" },
      { protocol: "https", hostname: "data4library.kr" },
      { protocol: "https", hostname: "image.aladin.co.kr" },
      { protocol: "http", hostname: "image.aladin.co.kr" },
    ],
  },
};

export default nextConfig;
