/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: [
    "custom/base",
    "custom/react",
  ],

  ignorePatterns: [
      "src/components",
      "src/lib/orchestrator"
  ]
};

module.exports = config;