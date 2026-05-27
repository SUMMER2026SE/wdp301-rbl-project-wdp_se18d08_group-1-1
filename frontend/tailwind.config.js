/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          light: "#FBF5B7",
          DEFAULT: "#D4AF37",
          dark: "#AA771C",
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
      },
      animation: {
        ringGlow: "ringGlow 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
