// Compiles the two public SCSS entrypoints (tokens-only and full theme) to
// plain CSS under dist/, so a consumer that has no Dart Sass toolchain can
// still `import "@iam3xtr/ui/styles/tokens.css"` / `theme.css` directly.
//
// The Sass sources remain the primary contract (`exports` also publishes
// `styles/tokens.scss` / `styles/theme.scss`) for consumers who want to
// configure their own Sass pipeline; this script only produces the
// pre-compiled fallback.
import { compile } from "sass";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(root, "dist");

const entries = [
  { name: "tokens", loadPeers: false },
  { name: "theme", loadPeers: true },
];

mkdirSync(distDir, { recursive: true });

for (const { name, loadPeers } of entries) {
  const file = path.join(root, "src", "styles", `${name}.scss`);
  const result = compile(file, {
    style: "expanded",
    loadPaths: loadPeers ? [path.join(root, "node_modules")] : [],
    quietDeps: true,
  });
  writeFileSync(path.join(distDir, `${name}.css`), result.css);
  // eslint-disable-next-line no-console
  console.log(`built dist/${name}.css (${result.css.length} bytes)`);
}
