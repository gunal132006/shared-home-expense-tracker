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
          bg: '#F2F2F7',          // True iOS system background
          card: '#FFFFFF',        // Pure white for cards
          text: '#000000',        // Pure black for primary text
          textMuted: '#8E8E93',   // iOS muted gray
          blue: '#007AFF',        // Vivid iOS Blue
          blueLight: '#E5F1FF',
          green: '#34C759',       // Vivid iOS Green
          greenLight: '#E8F8EC',
          red: '#FF3B30',         // Vivid iOS Red
          redLight: '#FFECEB',
          border: '#E5E5EA',
          gray: '#E5E5EA',
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
