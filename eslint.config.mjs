import nextLint from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextLint(),
  {
    rules: {
      "@next/next/no-img-element": "off"
    }
  }
];

export default config;
