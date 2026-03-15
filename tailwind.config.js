import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#f7f8fc",
            foreground: "#070911",
            primary: {
              DEFAULT: "#4863bf",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#98a8de",
              foreground: "#070911",
            },
            accent: {
              DEFAULT: "#6b82d3",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          extend: "light",
          colors: {
            background: "#f7f8fc",
            foreground: "#070911",
            primary: {
              DEFAULT: "#4863bf",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#98a8de",
              foreground: "#070911",
            },
            accent: {
              DEFAULT: "#6b82d3",
              foreground: "#ffffff",
            },
            content1: "#ffffff",
            content2: "#f4f4f5",
            content3: "#e4e4e7",
            content4: "#d4d4d8",
          },
        },
      },
    }),
  ],
};

module.exports = config;
