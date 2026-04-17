/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9fa',
          100: '#d9f0f2',
          200: '#b7e4e8',
          300: '#84cfd5',
          400: '#4aafc0',
          500: '#2e93a7',
          600: '#01696f',
          700: '#0c4e54',
          800: '#0f3638',
          900: '#0a2527',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
