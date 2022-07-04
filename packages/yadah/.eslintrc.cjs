const path = require("path");

module.exports = {
  env: { node: true, es6: true },
  extends: ["eslint:recommended", "prettier"],
  parser: "@babel/eslint-parser",
  parserOptions: {
    babelOptions: {
      cwd: __dirname,
      configFile: path.join(__dirname, ".babelrc"),
    },
  },
  rules: {
    "no-buffer-constructor": "error",
  },
};
