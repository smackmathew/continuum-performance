/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark blue: headings, dark sections, footer
        navy: {
          50: '#eef2f9', 100: '#d9e1f0', 200: '#b3c2de', 300: '#8099c4', 400: '#4f6fa3',
          500: '#2f4f86', 600: '#1f3b6e', 700: '#172d56', 800: '#102142', 900: '#0b1730', 950: '#070f20',
        },
        // Red-orange: buttons, accents. Use 600+ for text/buttons on white (AA contrast);
        // 400 for accents on navy; 500 for decorative shapes only.
        flame: {
          50: '#fff4ef', 100: '#ffe3d7', 200: '#ffc4aa', 300: '#ff9e75', 400: '#ff7a45',
          500: '#f2511b', 600: '#d63a0f', 700: '#b4300b', 800: '#8f2810',
        },
        mist: '#f5f7fb', // light section background
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
