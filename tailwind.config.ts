import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade visual do Dogão da Praça
        brand: {
          red: {
            DEFAULT: "#E11D2E", // vermelho ketchup - cor principal
            dark: "#B4121F",
            light: "#F04455",
          },
          mustard: {
            DEFAULT: "#F5B301", // amarelo mostarda - cor de destaque
            dark: "#C98E00",
            light: "#FFCB33",
          },
          white: "#FAF7F2",
        },
        // Tons escuros (base da aplicação - couro/carvão de trailer)
        charcoal: {
          950: "#120D0A",
          900: "#1B1410",
          800: "#241B15",
          700: "#332619",
          600: "#4A3826",
          500: "#6B5643",
          400: "#8F7B67",
          300: "#B7A797",
        },
      },
      fontFamily: {
        display: [
          "Arial Narrow",
          "Helvetica Neue Condensed",
          "Arial",
          "sans-serif",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.35), 0 1px 1px 0 rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
