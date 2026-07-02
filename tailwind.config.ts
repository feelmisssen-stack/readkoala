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
          heading: "rgb(var(--color-koala-heading-rgb) / <alpha-value>)",
          text: "rgb(var(--color-koala-text-rgb) / <alpha-value>)",
          muted: "rgb(var(--color-koala-muted-rgb) / <alpha-value>)",
          "muted-soft": "rgb(var(--color-koala-muted-soft-rgb) / <alpha-value>)",
          primary: "rgb(var(--color-koala-primary-rgb) / <alpha-value>)",
          "primary-active": "rgb(var(--color-koala-primary-active-rgb) / <alpha-value>)",
          secondary: "rgb(var(--color-koala-secondary-rgb) / <alpha-value>)",
          "surface-soft": "rgb(var(--color-koala-surface-soft-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-koala-accent-rgb) / <alpha-value>)",
          dark: "rgb(var(--color-koala-dark-rgb) / <alpha-value>)",
          "dark-elevated": "rgb(var(--color-koala-dark-elevated-rgb) / <alpha-value>)",
          "on-dark": "rgb(var(--color-koala-on-dark-rgb) / <alpha-value>)",
          "on-dark-soft": "rgb(var(--color-koala-on-dark-soft-rgb) / <alpha-value>)",
        },
      },
      borderRadius: {
        koala: "var(--radius-koala)",
        "koala-lg": "var(--radius-koala-lg)",
        "koala-btn": "var(--radius-koala-btn)",
        pill: "var(--radius-koala-pill)",
      },
      fontFamily: {
        display: ["var(--font-reading)"],
        ui: ["var(--font-reading)"],
        reading: ["var(--font-reading)"],
      },
      maxWidth: {
        content: "75rem",
      },
    },
  },
  plugins: [],
};

export default config;
