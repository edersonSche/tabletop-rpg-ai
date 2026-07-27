/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Geist Pixel"', "monospace"],
      },
      colors: {
        navy: {
          950: "#030810",
          900: "#050B1B",
          800: "#071326",
          700: "#0A1629",
          600: "#0B1729",
          500: "#101E33",
          400: "#1A2940",
        },
        panel: {
          950: "#0a0a0a",
          900: "#111111",
          800: "#1a1a1a",
          700: "#222222",
        },
        bronze: {
          400: "#A87448",
          500: "#8B5E3C",
          600: "#6B4423",
          700: "#4E3218",
        },
        cyan: {
          300: "#39E7FF",
          400: "#00D9FF",
          500: "#00BFEF",
          600: "#0099BF",
          700: "#00738F",
        },
        magic: {
          500: "#A84CC4",
          600: "#7B2D8B",
          700: "#5A246E",
          800: "#3D1849",
        },
        forest: {
          600: "#236345",
          700: "#164A35",
          800: "#0D332B",
          900: "#081F1B",
        },
        gold: {
          300: "#F5C75D",
          400: "#E6A93A",
          500: "#C58A2B",
          600: "#A07020",
          700: "#7A5518",
        },
        blood: {
          500: "#C44343",
          600: "#A52A35",
          700: "#7A1E2B",
          800: "#521420",
        },
        stone: {
          300: "#D5D0B8",
          400: "#B7B5A5",
          500: "#9A9888",
          600: "#8C8B82",
          700: "#6E6D66",
        },
        wood: {
          500: "#9A5B32",
          600: "#784329",
          700: "#5A301F",
          800: "#3E2115",
        },
      },
      boxShadow: {
        "glow-cyan": "0 0 12px rgba(0, 217, 255, 0.3)",
        "glow-cyan-lg": "0 0 24px rgba(0, 217, 255, 0.4)",
        "glow-gold": "0 0 12px rgba(197, 138, 43, 0.3)",
        "glow-gold-lg": "0 0 24px rgba(197, 138, 43, 0.4)",
        "glow-magic": "0 0 12px rgba(168, 76, 196, 0.3)",
        "inner-glow-cyan": "inset 0 0 8px rgba(0, 217, 255, 0.15)",
        "inner-glow-gold": "inset 0 0 8px rgba(197, 138, 43, 0.15)",
      },
      animation: {
        "crystal-pulse": "crystal-pulse 3s ease-in-out infinite",
        "magic-glow": "magic-glow 4s ease-in-out infinite",
        "thinking-dots": "thinking-dots 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "crystal-pulse": {
          "0%, 100%": {
            opacity: "0.6",
            boxShadow: "0 0 8px rgba(0, 217, 255, 0.2)",
          },
          "50%": { opacity: "1", boxShadow: "0 0 20px rgba(0, 217, 255, 0.5)" },
        },
        "magic-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "thinking-dots": {
          "0%, 20%": { opacity: "0" },
          "50%": { opacity: "1" },
          "80%, 100%": { opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      backgroundImage: {
        "gradient-navy":
          "linear-gradient(180deg, #050B1B 0%, #071326 50%, #0A1629 100%)",
        "gradient-navy-radial":
          "radial-gradient(ellipse at center, #0B1729 0%, #050B1B 100%)",
        "gradient-gold-shimmer":
          "linear-gradient(90deg, transparent, rgba(197, 138, 43, 0.15), transparent)",
      },
    },
  },
  plugins: [],
};
