/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "variable-collection-bg": "var(--variable-collection-bg)",
        "variable-collection-color": "var(--variable-collection-color)",
      },
      fontFamily: {
        default: "var(--default-font-family)",
      },
    },
  },
  plugins: [],
}; 