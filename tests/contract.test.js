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
