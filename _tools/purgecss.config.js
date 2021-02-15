module.exports = {
  content: ['_site/**/*.html','_site/assets/js/main.js'],
  css: ['_site/assets/css/main.css'],
  output: '_site/assets/css/main.css',
  fontFace: true,
  safelist: {
    deep: [/^leaflet/]
  }
}
