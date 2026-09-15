# @iam3xtr/ui

Visual foundation for 3xtr.im applications.

Owns design tokens, CSS/SCSS themes, and shared visual assets such as the logo
and loader SVGs. It does not own Vue components, application state, routing,
API clients, or domain logic — that boundary belongs to `@iam3xtr/vue`
(components/composables) and to each consuming application.

## Two independent contracts

The package exposes two entrypoints that a consumer picks between; neither
one requires the other, and installing/importing the tokens-only entrypoint
never pulls in Bulma, Buefy, or a Vue runtime.

### Tokens only

```js
import "@iam3xtr/ui/styles/tokens.css"; // pre-compiled, no Dart Sass needed
```

```scss
@use "@iam3xtr/ui/styles/tokens.scss"; // Sass source, if you compile it yourself
```

Defines the runtime `--tr-*` custom properties (brand/semantic colors,
surfaces, text, borders, and the z-index scale) for both
`:root[data-theme="light"]` and `:root[data-theme="dark"]`. No reset, no
component styles, no Bulma/Buefy, no JavaScript.

### Full theme

```js
import Buefy from "buefy";
import "@iam3xtr/ui/styles/theme.css"; // or theme.scss, see below
```

```scss
@use "@iam3xtr/ui/styles/theme.scss";
```

The complete Bulma/Buefy component theme (shell, navigation, forms, tables,
overlays, etc.) — includes the same tokens as above (no duplication) plus
every themed selector. Requires the consumer to install `bulma` and `buefy`
themselves (declared as optional `peerDependencies` here so a tokens-only
consumer never gets them transitively) and to load Buefy/Bulma exactly once.
Do not also import `buefy/dist/css/buefy.css` — that produces two conflicting
stylesheets.

Compiling `theme.scss` yourself (instead of using the pre-built `theme.css`)
requires `bulma` and `buefy` to be resolvable from your own `node_modules`,
since it does `@use "bulma/sass" with (...)` and `@use "buefy/src/scss/
buefy"`.

### Assets

```js
import logo from "@iam3xtr/ui/assets/logo.svg";
import loader from "@iam3xtr/ui/assets/loader-mono.svg";
import anthropicIcon from "@iam3xtr/ui/assets/icons/anthropic.svg";
```

Raw SVG files, resolved by the consumer's own bundler/asset pipeline (e.g.
`vite-svg-loader`) — there is no baked-in absolute path or app base path
assumption, so these resolve correctly under any `base`/publicPath. The icon
set is the approved custom-icon registry documented in
[`docs/design-system.md`](https://github.com/iam3xtr/trickster-ui-kit/blob/main/docs/design-system.md#иконки)
(LLM vendor logos, the vendor fallback, and model-kind icons) — everything
else in the UI is a Material Design Icons name (`@mdi/font`, loaded by the
consumer explicitly and exactly once; this package does not ship a font or an
MDI subset).

## Theming

Theme is switched by the consumer setting
`document.documentElement.dataset.theme = "light" | "dark"`; both
entrypoints style off that attribute, not a class.

## What's not here

No fixtures, `.env` files, build secrets, demo data, or a second copy of the
theme. No Vue components, Pinia stores, routing, or domain/product logic —
see `@iam3xtr/vue` and the consuming application for those.

## Development

```bash
npm install   # pulls bulma/buefy/sass as devDependencies, needed to build theme.css
npm run build # compiles dist/tokens.css and dist/theme.css
npm test      # builds, then runs the export/allowlist/pack contract tests
```
