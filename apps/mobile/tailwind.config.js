/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // 배달 플랫폼 컬러 팔레트
        delivery: {
          orange: '#f97316',
          red: '#dc2626',
          green: '#16a34a',
          blue: '#2563eb',
          gray: '#6b7280',
        }
      },
      fontFamily: {
        // 한글 폰트 지원
        sans: ['System'],
      },
    },
  },
  plugins: [],
} 