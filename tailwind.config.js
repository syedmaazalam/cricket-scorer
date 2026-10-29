/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cricket: {
          pitch: '#f59e0b',
          grass: '#15803d',
          wicket: '#dc2626',
          boundary: '#2563eb',
          gold: '#eab308'
        }
      }
    },
  },
  plugins: [],
}
