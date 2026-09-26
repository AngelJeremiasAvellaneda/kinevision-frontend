/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6f9fb',
          100: '#b3eff5',
          200: '#80e4ef',
          300: '#4dd9e9',
          400: '#26cfe3',
          500: '#00c5dd',  // main cyan
          600: '#00a8bc',
          700: '#008a9a',
          800: '#006d79',
          900: '#004f57',
        },
        dark: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(0,197,221,0.08)',
        'card-hover': '0 4px 24px 0 rgba(0,197,221,0.16)',
      }
    },
  },
  plugins: [],
}
