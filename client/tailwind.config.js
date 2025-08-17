/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{html,js,ts,jsx,tsx}"],
  important: true,
  theme: {
    extend: {
      colors: {
        "variable-collection-bg": "var(--variable-collection-bg)",
        "variable-collection-color": "var(--variable-collection-color)",
        'custom-pink': '#FF36FC',
        'custom-purple': '#C83CFF',
        'custom-blue': '#7A4DFF',
        'custom-light': '#D8CAFF',
      },
      fontFamily: {
        default: "var(--default-font-family)",
        pretendard: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'custom-circle-gradient': 'linear-gradient(180deg, #4A1CC1 0%, #A31ABD 100%)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}; 