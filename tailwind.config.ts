import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        'therapy-blue': '#6366f1',
        'therapy-pink': '#ec4899',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        ripple: {
          '0%': {
            transform: 'scale(0)',
            opacity: 1,
          },
          '20%': {
            transform: 'scale(1)',
            opacity: 1,
          },
          '100%': {
            opacity: 0,
            transform: 'scale(1.5)',
          },
        },
        blob: {
          '0%': {
            borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%',
            transform: 'translate(0px, 0px) rotate(0deg)',
          },
          '50%': {
            borderRadius: '30% 60% 70% 40%/50% 60% 30% 60%',
            transform: 'translate(20px, -10px) rotate(45deg)',
          },
          '100%': {
            borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%',
            transform: 'translate(0px, 0px) rotate(90deg)',
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        ripple: 'ripple 1.5s linear infinite',
        blob: 'blob 7s infinite linear',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
