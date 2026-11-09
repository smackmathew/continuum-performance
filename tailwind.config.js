/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0d10', 900: '#12151a', 800: '#1a1e25', 700: '#262b34', 600: '#3a414d' },
        volt: { 300: '#e4ff7a', 400: '#d4ff3f', 500: '#bff000', 600: '#9bc400' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
