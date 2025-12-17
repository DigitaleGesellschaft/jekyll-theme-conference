module.exports = {
  content: ["_site/**/*.html", "_site/assets/js/*.js"],
  css: [
    "_site/assets/css/conference.bundle.css",
    "_site/assets/css/main.css",
  ],
  output: "_site/assets/css/",
  fontFace: true,
  safelist: {
    deep: [/^leaflet/, /^bi-/],
  },
};
