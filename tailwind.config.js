/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand colors derived from the Xonaris logo
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399', // Primary accent on dark backgrounds
          500: '#10b981', // Medium accent
          600: '#059669', // Strong accent (buttons, CTAs)
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        navy: {
          50:  '#f0f4f8',
          100: '#dae3ed',
          200: '#b8c9db',
          300: '#8ba7c1',
          400: '#5e82a3',
          500: '#44678a',
          600: '#2d3e50', // Logo navy (icon & wordmark)
          700: '#243445',
          800: '#1a2636',
          900: '#0f1720',
          950: '#080d12', // Body background
        },
        mint: {
          50:  '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb5',
          400: '#4ade8f',
          500: '#22c56d',
          600: '#16a354',
          700: '#158044',
          800: '#166539',
          900: '#145331',
          950: '#052e19',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.6s ease-out both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'zoom-in': 'zoomIn 0.5s ease-out both',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
