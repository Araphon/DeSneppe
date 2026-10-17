import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#141414',
        cream: '#FBF7F1',
        sand: '#F2EADF',
        brand: { DEFAULT: '#F2B124', dark: '#7A5200', light: '#FBEBC4', hover: '#E09E0E' },
        mustard: '#F2B124',
        basil: '#2F6B4F',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(20,20,20,.06), 0 4px 16px rgba(20,20,20,.06)' },
    },
  },
  plugins: [],
}
export default config
