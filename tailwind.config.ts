import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx,css}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        koala: {
          bg: "rgb(var(--color-koala-bg-rgb) / <alpha-value>)",
          card: "rgb(var(--color-koala-card-rgb) / <alpha-value>)",
          text: "rgb(var(--color-koala-text-rgb) / <alpha-value>)",
          muted: "rgb(var(--color-koala-muted-rgb) / <alpha-value>)",
          primary: "rgb(var(--color-koala-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--color-koala-secondary-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-koala-accent-rgb) / <alpha-value>)",
        },
      },
      borderRadius: {
        koala: "var(--radius-koala)",
        "koala-lg": "var(--radius-koala-lg)",
        pill: "var(--radius-koala-pill)",
      },
      fontFamily: {
        reading: ["var(--font-noto-serif)", "var(--font-reading)"],
      },
    },
  },
  plugins: [],
};

export default config;
