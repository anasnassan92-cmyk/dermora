// tailwind.config.js – Dermora
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        dermora: {
          'teal': '#0C9387',
          'mint': '#DFF2F0',
          'skin': '#F8FCFB',
          'charcoal': '#1F1F1F',
          'gray': '#E9ECEF',
          'deep-teal': '#04776B',
          'teal-mid': '#088579',
          'teal-soft': '#3DA99F',
          'teal-light': '#6DBEB7',
          'mint-deep': '#B5DFDB',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '10px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'full': '999px',
      },
    },
  },
};
