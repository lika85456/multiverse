/** @type {import('eslint').Linter.Config} */
const config = {
  extends: ["plugin:@next/next/recommended"],
  rules: {
    "react/display-name": "off",
  }
};

module.exports = config;
