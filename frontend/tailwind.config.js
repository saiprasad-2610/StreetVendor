/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        smc: {
          blue: '#1e40af',
          gold: '#fbbf24',
        }
      }
    },
  },
  plugins: [],
}
