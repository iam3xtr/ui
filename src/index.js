// Task A11.2 keeps this root JS entrypoint intentionally empty: `@iam3xtr/ui`
// ships tokens, theme and assets as CSS/SCSS/SVG file exports (see the
// `exports` map in package.json — `./styles/tokens.scss`, `./styles/
// tokens.css`, `./styles/theme.scss`, `./styles/theme.css`, `./assets/*`),
// not as JavaScript. There is no Vue, Buefy or application-state dependency
// here; that boundary belongs to `@iam3xtr/vue` (Task A11.3).
export {};
