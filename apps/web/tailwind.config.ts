import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18181b",
        paper: "#f8f9fa",
        line: "#e4e4e7"
      }
    }
  },
  plugins: []
};

export default config;
