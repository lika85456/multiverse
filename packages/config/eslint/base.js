/** @type {import("eslint").Linter.Config} */
const config = {
  extends: [
    "turbo",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  env: {
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],
    "@typescript-eslint/no-misused-promises": [
      2,
      { checksVoidReturn: { attributes: false } },
    ],
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
    quotes: ["error", "double"],
    "space-before-function-paren": ["error", "never"],
    "space-before-blocks": ["error", "always"],
    "keyword-spacing": [
        "error",
        {
            before: true,
            after: true,
        },
    ],
    semi: "off",
    "@typescript-eslint/semi": ["error", "always"],
    indent: ["error", 4],
    "object-curly-spacing": ["error", "always"],
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/no-empty-function": "warn",
    "object-property-newline": [
        "error",
        { allowAllPropertiesOnSameLine: false },
    ],
    "object-curly-newline": ["error", {
        multiline: true,
        minProperties: 3
    }],
    "key-spacing": ["error", {
        beforeColon: false,
        afterColon: true
    }],
    "no-trailing-spaces": "error",
    "array-bracket-spacing": ["error", "never"],
    "computed-property-spacing": ["error", "never"],
    "space-in-parens": ["error", "never"],
    "space-infix-ops": "error",
    "array-bracket-newline": ["error", "consistent"],
    "space-unary-ops": "error",
    "arrow-spacing": "error",
    "comma-spacing": "error",
    "comma-style": "error",
    "func-call-spacing": "error",
    "function-paren-newline": ["error", "multiline"],
    "max-len": [
        "error",
        {
            code: 140,
            ignoreComments: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
        },
    ],
    "no-multiple-empty-lines": ["error", {
        max: 1,
        maxEOF: 1,
        maxBOF: 0
    }],
    "no-multi-spaces": "error",
    "no-whitespace-before-property": "error",
    "no-irregular-whitespace": "error",
    "eol-last": ["error", "never"],
    eqeqeq: ["error", "always"],
    "no-else-return": "error",
    "max-depth": ["error", 3],
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: [
    "**/.eslintrc.cjs",
    "**/*.config.js",
    "**/*.config.cjs",
    "packages/config/**",
    ".next",
    "dist",
    "pnpm-lock.yaml",
  ],
  reportUnusedDisableDirectives: true,
};

module.exports = config;
