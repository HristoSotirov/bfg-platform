/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'bfg-blue': '#6185A8',      // Основен син цвят
        'bfg-teal': '#488E99',      // Teal за акценти
        'bfg-dark-gray': '#374151', // Тъмно сиво за header/footer
        'bfg-light-gray': '#f3f4f6', // Светло сиво за content areas
        'bfg-red': '#dc2626',        // Червено за лого
      },
      spacing: {
        'header': '64px',
        'nav': '48px',
      },
      height: {
        'header': '64px',
        'nav': '48px',
      },
      borderRadius: {
        'button': '8px',
        'card': '12px',
      }
    },
  },
  plugins: [],
}

