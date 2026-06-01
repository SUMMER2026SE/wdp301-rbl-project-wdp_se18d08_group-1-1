/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        'sidebar-accent': 'var(--sidebar-accent)',
        'sidebar-border': 'var(--sidebar-border)',
        gold: {
          light: 'var(--gold-soft)',
          DEFAULT: 'var(--gold)',
          dark: 'var(--gold-deep)',
          deep: 'var(--gold-deep)',
        },
        charcoal: "#111111",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      keyframes: {
        ringGlow: {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(234,179,8,0.35), 0 0 40px rgba(234,179,8,0.1)",
          },
          "50%": {
            boxShadow:
              "0 0 45px rgba(234,179,8,0.7), 0 0 80px rgba(234,179,8,0.3)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        accordionDown: {
          from: { maxHeight: "0", opacity: "0" },
          to: { maxHeight: "400px", opacity: "1" },
        },
        flowDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flowUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        flowRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)' },
          '50%': { opacity: .7, boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)' },
        },
        scan: {
          "0%, 100%": { top: "0%" },
          "50%": { top: "100%" },
        },
        chargePulse: {
          '0%, 100%': { color: '#10b981', textShadow: '0 0 5px #10b981' },
          '50%': { color: '#34d399', textShadow: '0 0 15px #34d399' },
        },
      },
      animation: {
        ringGlow: "ringGlow 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        'flow-down': 'flowDown 2s linear infinite',
        'flow-up': 'flowUp 2s linear infinite',
        'flow-right': 'flowRight 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        scan: "scan 2.5s ease-in-out infinite",
        'charge': 'chargePulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
