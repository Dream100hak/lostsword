import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./data/**/*.{json,ts}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0b0b14",
        panel: "#f5f5f7",
        accent: "#7c3aed"
      }
    }
  },
  plugins: []
};

export default config;
