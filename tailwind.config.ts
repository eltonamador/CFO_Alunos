import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Paleta institucional CBMAP — Academia Bombeiro Militar
        "brand-red": {
          50:  "#fbeeef",
          100: "#f5d9da",
          500: "#b8333a",
          600: "#a32127",
          700: "#8b1a1f",
          800: "#76161a",
          900: "#5e0f12",
          DEFAULT: "#8b1a1f",
        },
        "brand-gold": {
          100: "#f6ecd1",
          300: "#e3c98a",
          500: "#c8a24b",
          600: "#a8842a",
          700: "#8a6a1f",
          DEFAULT: "#c8a24b",
        },
        ink: {
          50:  "#f5f2e6",
          100: "#ece8d8",
          200: "#ddd9c9",
          300: "#c2bdac",
          400: "#9c9788",
          500: "#7a7567",
          600: "#5a564a",
          700: "#3a362c",
          800: "#25221b",
          900: "#16140f",
        },
        paper: "#fafaf3",
        // Alias legado (compatibilidade)
        cbmap: {
          red: {
            DEFAULT: "#8b1a1f",
            50:  "#fbeeef",
            100: "#f5d9da",
            500: "#b8333a",
            600: "#a32127",
            700: "#8b1a1f",
            800: "#76161a",
            900: "#5e0f12",
          },
          gold: "#c8a24b",
          dark: "#1a1612",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Barlow", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Barlow Condensed", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "card-sm": "0 1px 2px rgba(20, 16, 8, 0.06)",
        "card-md": "0 4px 14px rgba(20, 16, 8, 0.08), 0 1px 2px rgba(20,16,8,0.04)",
        "card-lg": "0 10px 30px rgba(20, 16, 8, 0.12)",
      },
    },
  },
  plugins: [animate],
};

export default config;
