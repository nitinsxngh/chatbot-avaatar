import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: "#f5f5f7",
          card: "#ffffff",
          text: "#1d1d1f",
          secondary: "#86868b",
          border: "#d2d2d7",
          accent: "#0071e3",
          fill: "#f5f5f7",
          bubble: "#e9e9eb",
        },
      },
      boxShadow: {
        apple: "0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.04)",
        "apple-lg": "0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
