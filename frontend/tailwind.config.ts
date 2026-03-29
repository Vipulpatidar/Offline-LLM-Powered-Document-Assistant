import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
          sunken: "hsl(var(--surface-sunken))",
        },
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        status: {
          pending: "hsl(var(--status-pending))",
          running: "hsl(var(--status-running))",
          completed: "hsl(var(--status-completed))",
          error: "hsl(var(--status-error))",
        },
        chat: {
          user: "hsl(var(--chat-user))",
          "user-foreground": "hsl(var(--chat-user-foreground))",
          assistant: "hsl(var(--chat-assistant))",
          "assistant-foreground": "hsl(var(--chat-assistant-foreground))",
        },
        score: {
          high: "hsl(var(--score-high))",
          mid: "hsl(var(--score-mid))",
          low: "hsl(var(--score-low))",
        },
        log: {
          bg: "hsl(var(--log-bg))",
          foreground: "hsl(var(--log-foreground))",
          muted: "hsl(var(--log-muted))",
          timestamp: "hsl(var(--log-timestamp))",
        },
        tab: {
          active: "hsl(var(--tab-active))",
          "active-foreground": "hsl(var(--tab-active-foreground))",
          inactive: "hsl(var(--tab-inactive))",
          "inactive-foreground": "hsl(var(--tab-inactive-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        ee: {
          bg: "hsl(var(--ee-bg))",
          surface: "hsl(var(--ee-surface))",
          "surface-raised": "hsl(var(--ee-surface-raised))",
          border: "hsl(var(--ee-border))",
          foreground: "hsl(var(--ee-foreground))",
          muted: "hsl(var(--ee-muted))",
          node: {
            query: "hsl(var(--ee-node-query))",
            claim: "hsl(var(--ee-node-claim))",
            chunk: "hsl(var(--ee-node-chunk))",
            document: "hsl(var(--ee-node-document))",
          },
          confidence: "hsl(var(--ee-confidence))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        card: "0 2px 8px -2px rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)",
        elevated: "0 4px 16px -4px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
