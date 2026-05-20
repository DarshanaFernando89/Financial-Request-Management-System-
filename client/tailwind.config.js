/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        university: {
          gold: '#F2C94C',
          goldDark: '#D8A900',
          maroon: '#6E2B2B',
          maroonDark: '#4C1E1E',
          ink: '#1F2933',
          slate: '#52606D'
        }
      },
      boxShadow: {
        soft: '0 12px 30px rgba(31, 41, 51, 0.08)'
      }
    }
  },
  plugins: []
};
