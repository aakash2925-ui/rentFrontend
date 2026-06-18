/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#241238",
        meadow: "#7c3aed",
        clay: "#a855f7",
        mist: "#f0e5fa"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(87, 56, 117, 0.15)",
        glow: "0 24px 80px rgba(124, 58, 237, 0.28)"
      }
    }
  },
  plugins: []
};
