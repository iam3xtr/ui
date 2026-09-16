import { defineConfig } from "vitest/config";

// A plain-JS/SCSS package with no ancestor-independent config of its own would
// otherwise inherit whatever vitest.config.js Vitest finds by walking up the
// directory tree — e.g. the trickster-ui-kit monorepo's own config when this
// package is checked out as its packages/ui submodule, whose narrower
// `include` doesn't match tests/contract.test.js and silently reports "no
// test files found". Pinning root/include here keeps config resolution
// inside this package regardless of where it's checked out.
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ["tests/**/*.test.js"],
  },
});
