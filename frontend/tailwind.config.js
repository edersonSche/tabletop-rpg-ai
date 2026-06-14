/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['VT323', '"Space Mono"', 'Courier New', 'monospace'],
      },
      colors: {
        parchment: {
          50: '#fdf8f0',
          100: '#f5f0e8',
          200: '#f0ebe0',
          300: '#e0d5c0',
          400: '#c0b090',
          500: '#a09070',
          600: '#8b4513',
          700: '#6b3410',
          800: '#4a250c',
          900: '#2c1810',
        },
        dungeon: {
          50: '#e0e0e0',
          100: '#c0c0c0',
          200: '#808080',
          300: '#404040',
          400: '#20202e',
          500: '#1a1a2e',
          600: '#16213e',
          700: '#12121e',
          800: '#0f0f1a',
          900: '#0a0a12',
        },
        gold: '#d4a017',
        blood: '#c0392b',
        magic: '#6c5ce7',
      },
    },
  },
  plugins: [],
};
