/** @type {import('eslint').Linter.Config} */
const config = {
    root: true,
    extends: [
        "custom/base",
    ],
    parserOptions: {
        ecmaVersion: "latest",
        project: true,
        tsconfigRootDir: __dirname
    },
};

module.exports = config;