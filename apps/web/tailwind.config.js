/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      // Map your dynamic CSS variables directly to Tailwind utility tokens
      colors: {
        app: {
          bg: 'var(--app-bg)',
          panel: 'var(--app-panel)',
          border: 'var(--app-border)',
          muted: 'var(--app-muted)',
        },
        brand: {
          primary: 'var(--brand-primary)',
          'primary-hover': 'var(--brand-primary-hover)',
        }
      }
    },
  },
  plugins: [],
}