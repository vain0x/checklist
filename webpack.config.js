const path = require("path")

module.exports = {
  entry: {
    pako: "./src/pako.js",
  },
  output: {
    path: path.resolve(__dirname, "docs"),
    filename: "[name].js",
  },
}
