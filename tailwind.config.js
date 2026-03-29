/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkblue: '#0d1117',
        cardbg: 'rgba(255, 255, 255, 0.05)',
        greenaccent: '#00ffcc',
        redaccent: '#ff4c4c',
      }
    },
  },
  plugins: [],
}
