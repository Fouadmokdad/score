/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#b8d6ff',
          300: '#8ab8ff',
          400: '#5790ff',
          500: '#2f6cff',
          600: '#1d4ff5',
          700: '#173ed1',
          800: '#1735a8',
          900: '#1a3286',
        },
      },
    },
  },
  plugins: [],
};
