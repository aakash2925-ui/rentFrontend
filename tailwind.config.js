/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        meadow: "#2f6f4e",
        clay: "#b96244",
        mist: "#f4f7f2"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 33, 27, 0.10)"
      }
    }
  },
  plugins: []
};
