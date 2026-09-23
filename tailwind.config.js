/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 40px rgba(59, 130, 246, 0.35)',
      },
      colors: {
        panel: '#101827',
        panelSoft: '#121d2d',
        accent: '#67e8f9',
        accentBlue: '#3b82f6',
        purpleGlow: '#8b5cf6',
      },
      backgroundImage: {
        'hero-grid': 'radial-gradient(circle at top, rgba(59,130,246,0.25), transparent 40%)',
      },
    },
  },
  plugins: [],
}

