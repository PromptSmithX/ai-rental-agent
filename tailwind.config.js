/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        textPrimary: '#0F172A',
        textMuted: '#475569',
        borderMuted: '#E2E8F0',
        warningToken: '#B45309',
        errorToken: '#B91C1C',
        successToken: '#15803D',
      },
      borderRadius: {
        chip: '8px',
        input: '12px',
        card: '16px',
        panel: '20px',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
