/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        apple: {
          bg: 'rgb(var(--apple-bg) / <alpha-value>)',
          card: 'rgb(var(--apple-card) / <alpha-value>)',
          text: 'rgb(var(--apple-text) / <alpha-value>)',
          textMuted: 'rgb(var(--apple-textMuted) / <alpha-value>)',
          blue: 'rgb(var(--apple-blue) / <alpha-value>)',
          blueLight: 'rgb(var(--apple-blueLight) / <alpha-value>)',
          green: 'rgb(var(--apple-green) / <alpha-value>)',
          greenLight: 'rgb(var(--apple-greenLight) / <alpha-value>)',
          red: 'rgb(var(--apple-red) / <alpha-value>)',
          redLight: 'rgb(var(--apple-redLight) / <alpha-value>)',
          border: 'rgb(var(--apple-border) / <alpha-value>)',
          gray: 'rgb(var(--apple-gray) / <alpha-value>)',
        }
      },
      boxShadow: {
        'apple': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'apple-lg': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'apple-xl': '0 20px 40px rgba(0, 0, 0, 0.1)',
        'apple-glow': '0 8px 24px rgba(0, 122, 255, 0.25)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
