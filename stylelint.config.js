// Same ruleset as the trickster-ui-kit consumer this package's SCSS was
// ported from (see AGENTS.md / CLAUDE.md there): no `!important`, no
// duplicate selectors. Kept in sync manually since this is a separate repo.
export default {
  extends: ["stylelint-config-recommended"],
  overrides: [
    {
      files: ["**/*.scss"],
      customSyntax: "postcss-scss",
    },
  ],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "use",
          "forward",
          "mixin",
          "include",
          "extend",
          "each",
          "for",
          "if",
          "else",
          "while",
        ],
      },
    ],
    "no-duplicate-selectors": true,
    "declaration-no-important": true,
    "no-descending-specificity": null,
  },
};
