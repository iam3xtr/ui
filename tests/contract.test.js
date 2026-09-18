import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

describe("exports map", () => {
  it("every export target resolves to a file inside the package", () => {
    for (const [specifier, target] of Object.entries(pkg.exports)) {
      // Wildcard export ("./assets/*"): resolve against a real sample file
      // instead of the literal "*" path.
      const resolved =
        target.includes("*") ? target.replace("*", "logo.svg") : target;

      expect(resolved.startsWith("./")).toBe(true);
      // Must stay a package-relative path — no absolute filesystem path, no
      // reference outside the package (no "..").
      expect(resolved).not.toMatch(/^\/|^[A-Za-z]:\\/);
      expect(resolved.split("/")).not.toContain("..");

      const abs = path.join(root, resolved);
      expect(
        existsSync(abs),
        `${specifier} -> ${resolved} does not exist (run "npm run build" first for dist/* targets)`,
      ).toBe(true);
    }
  });

  it("declares sideEffects so bundlers never drop the CSS/SCSS imports", () => {
    expect(pkg.sideEffects).toEqual(expect.arrayContaining(["*.css", "*.scss"]));
  });
});

describe("tokens-only entrypoint has no Vue/Buefy/Bulma runtime", () => {
  it("tokens.scss has no @use of bulma/buefy and only one dependency (trickster-tokens)", () => {
    const code = read("src/styles/tokens.scss")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/@use\s+["'](bulma|buefy)/);
    const uses = [...code.matchAll(/@use\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(uses).toEqual(["./trickster-tokens"]);
  });

  it("compiled tokens.css does not reference bulma, buefy or vue", () => {
    const css = read("dist/tokens.css");
    expect(css).not.toMatch(/buefy|bulma|vue/i);
    // Sanity: it should still contain the actual token contract.
    expect(css).toMatch(/--tr-primary:/);
    expect(css).toMatch(/data-theme=("dark"|dark)/);
  });

  it("bulma/buefy stay optional peerDependencies, never a hard dependency", () => {
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.peerDependencies).toMatchObject({ bulma: expect.any(String), buefy: expect.any(String) });
    expect(pkg.peerDependenciesMeta.bulma.optional).toBe(true);
    expect(pkg.peerDependenciesMeta.buefy.optional).toBe(true);
  });
});

describe("full theme reuses tokens instead of duplicating them", () => {
  it("theme.scss @uses ./tokens exactly once and does not redeclare the token block", () => {
    const src = read("src/styles/theme.scss");
    const usesTokens = src.match(/@use\s+"\.\/tokens"/g) ?? [];
    expect(usesTokens.length).toBe(1);
    // The runtime custom-property declarations must not be duplicated in
    // theme.scss itself — they live only in tokens.scss.
    expect(src).not.toMatch(/--tr-primary:/);
  });

  it("compiled theme.css contains both the token contract and Bulma/Buefy rules", () => {
    const css = read("dist/theme.css");
    expect(css).toMatch(/--tr-primary:/);
    expect(css).toMatch(/\.button/); // Bulma
  });
});

describe("content allowlist", () => {
  it("ships no fixtures, env files, or build secrets", () => {
    const forbidden = /\.env(\..*)?$|fixture|secret|\.pem$|\.key$/i;
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const p = path.join(dir, entry.name);
        expect(forbidden.test(entry.name)).toBe(false);
        if (entry.isDirectory()) walk(p);
      }
    };
    walk(path.join(root, "src"));
  });

  it("npm pack ships only the declared files, no tests/scripts/node_modules", () => {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    // Lifecycle scripts (even with --ignore-scripts some npm versions still
    // echo notices) and npm's own banner lines can precede the JSON payload
    // on stdout; the JSON array is always the trailing well-formed chunk.
    const jsonStart = out.indexOf("[");
    const [{ files }] = JSON.parse(out.slice(jsonStart));
    const paths = files.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining(["package.json", "README.md", "LICENSE", "src/index.js"]),
    );
    for (const p of paths) {
      expect(p.startsWith("tests/")).toBe(false);
      expect(p.startsWith("scripts/")).toBe(false);
      expect(p.startsWith("node_modules/")).toBe(false);
    }
  });
});

describe("mobile filters keep the .tr-mobile-filters__content copy visible", () => {
  it("scopes the 768px filter-hiding rule to the inline .tr-page-toolbar__filters wrapper, not every .tr-page-toolbar__filter", () => {
    // `Toolbar.vue` renders the `filters` slot twice: once inline (wrapped
    // in `.tr-page-toolbar__filters`) and once inside
    // `.tr-mobile-filters__content` (`MobileFilters.vue`) for the <=768px
    // trigger/panel. A bare, unscoped `.tr-page-toolbar__filter {
    // display: none; }` rule would hide both copies and leave the mobile
    // panel empty — this must stay scoped to the inline wrapper only.
    const src = read("src/styles/theme.scss");
    const lines = src.split("\n");
    const bareRuleIndex = lines.findIndex(
      (line) => line.trim() === ".tr-page-toolbar__filter {",
    );
    expect(bareRuleIndex).toBeGreaterThanOrEqual(0);
    // The one remaining bare-selector rule is the base sizing rule, not a
    // visibility toggle.
    expect(lines[bareRuleIndex + 1]).not.toMatch(/display:\s*none/);
    expect(src).toMatch(
      /\.tr-page-toolbar__filters \.tr-page-toolbar__filter\s*\{\s*\n\s*display:\s*none;/,
    );
  });

  it("compiled theme.css hides the inline filter pills but not the mobile-filters copy", () => {
    const css = read("dist/theme.css");
    // The compiled stylesheet mixes in Bulma's own unrelated 768px media
    // blocks, so match the specific rule anywhere in the file rather than
    // trying to isolate "the" 768px block.
    expect(css).toMatch(
      /\.tr-page-toolbar__filters \.tr-page-toolbar__filter\s*\{[^}]*display:\s*none/,
    );
    // No unscoped `.tr-page-toolbar__filter { ... display: none ... }` rule
    // exists anywhere — that would also hide the `.tr-mobile-filters__content`
    // copy of the same class.
    const unscoped = [
      ...css.matchAll(/([^{}\n]*)\.tr-page-toolbar__filter\s*\{([^}]*)\}/g),
    ].filter(
      ([, prefix, body]) =>
        !prefix.includes("__filters") && /display:\s*none/.test(body),
    );
    expect(unscoped).toHaveLength(0);
  });
});

describe("sidebar width and scrollbar-gutter stay the documented Issue #10.1 contract", () => {
  it("$sidebar-width is the canonical 232px, not the drifted 200px", () => {
    // This exact token drifted to 200px once, unnoticed, before Issue #10.1
    // restored it — a plain string check catches a repeat silently.
    const src = read("src/styles/_trickster-tokens.scss");
    expect(src).toMatch(/\$sidebar-width:\s*232px;/);
    expect(src).not.toMatch(/\$sidebar-width:\s*200px;/);
  });

  it(".tr-sidebar reserves scrollbar-gutter: stable with a supports fallback", () => {
    const src = read("src/styles/theme.scss");
    expect(src).toMatch(/scrollbar-gutter:\s*stable;/);
    expect(src).toMatch(
      /@supports not \(scrollbar-gutter:\s*stable\)\s*\{\s*\.tr-sidebar\s*\{\s*overflow-y:\s*scroll;/,
    );
  });

  it("compiled theme.css bakes in the 232px column and the scrollbar-gutter rule", () => {
    const css = read("dist/theme.css");
    expect(css).toMatch(/grid-template-columns:\s*232px minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.tr-sidebar\s*\{[^}]*scrollbar-gutter:\s*stable/);
  });
});

describe("assets resolve without an absolute or app base path", () => {
  it("ships the approved custom icon registry and shell assets as raw files", () => {
    const expectedIcons = [
      "anthropic",
      "brain",
      "cerebras",
      "cohere",
      "deepseek",
      "fireworks",
      "gemini",
      "gigachat",
      "google",
      "grok",
      "groq",
      "ionos",
      "jina",
      "kind-chat",
      "kind-embedding",
      "kind-rerank",
      "mistral",
      "nvidia",
      "openai",
      "openrouter",
      "perplexity",
      "sambanova",
      "scaleway",
      "together",
      "xai",
      "yandex",
    ];
    for (const name of expectedIcons) {
      expect(existsSync(path.join(root, "src/assets/icons", `${name}.svg`))).toBe(true);
    }
    for (const name of ["logo.svg", "loader-mono.svg", "loader-mono-static.svg"]) {
      expect(existsSync(path.join(root, "src/assets", name))).toBe(true);
    }
  });

  it("every custom icon sets fill=currentColor on the root <svg> and nowhere else hardcodes a fill", () => {
    const iconsDir = path.join(root, "src/assets/icons");
    for (const file of readdirSync(iconsDir)) {
      const svg = readFileSync(path.join(iconsDir, file), "utf8");
      const rootTag = svg.match(/<svg[^>]*>/)[0];
      expect(rootTag).toMatch(/fill="currentColor"/);
      const hardcodedFill = svg.match(/fill="#[0-9a-fA-F]+"/g) ?? [];
      expect(hardcodedFill, `${file} hardcodes a fill color`).toHaveLength(0);
    }
  });
});

describe("bundler-neutral icon registry (Issue #8.1)", () => {
  const expectedIcons = [
    "anthropic",
    "brain",
    "cerebras",
    "cohere",
    "deepseek",
    "fireworks",
    "gemini",
    "gigachat",
    "google",
    "grok",
    "groq",
    "ionos",
    "jina",
    "kind-chat",
    "kind-embedding",
    "kind-rerank",
    "mistral",
    "nvidia",
    "openai",
    "openrouter",
    "perplexity",
    "sambanova",
    "scaleway",
    "together",
    "xai",
    "yandex",
  ];

  it("dist/icons.js exists and its named export matches exports[\"./icons\"]", () => {
    expect(pkg.exports["./icons"]).toBe("./dist/icons.js");
    expect(existsSync(path.join(root, "dist/icons.js"))).toBe(true);
  });

  it("exposes exactly the documented custom-icon set, each as raw SVG markup", async () => {
    const { icons, default: defaultExport } = await import(
      path.join(root, "dist/icons.js")
    );
    expect(Object.keys(icons).sort()).toEqual([...expectedIcons].sort());
    expect(defaultExport).toBe(icons);
    for (const name of expectedIcons) {
      expect(typeof icons[name]).toBe("string");
      expect(icons[name]).toMatch(/<svg[^>]*>/);
    }
  });

  it("never duplicates MDI and never references Vue/Buefy in the generated module", () => {
    const code = read("dist/icons.js");
    expect(code).not.toMatch(/mdi|materialdesignicons/i);
    expect(code).not.toMatch(/\bvue\b|\bbuefy\b/i);
  });

  it("has no bundler-specific loader contract (no glob, no alias, no import.meta)", () => {
    const buildScript = read("scripts/build-icons.mjs");
    const generated = read("dist/icons.js");
    expect(generated).not.toMatch(/import\.meta\.glob|vite-svg-loader|@\/assets/);
    // The generator itself reads real files by path — that is a build-time
    // Node script, not a contract the published module exposes.
    expect(buildScript).toMatch(/readdirSync/);
  });
});
