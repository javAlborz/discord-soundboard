/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          dark: '#23272A',
          darker: '#2C2F33',
          light: '#99AAB5'
        }
      }
    },
  },
  plugins: [],
}