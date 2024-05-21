module.exports = {
  content: [
    './src/**/*.{html,js}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a202c',
        secondary: '#2d3748',
        accent: '#38b2ac',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
