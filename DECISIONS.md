# Decisions

- **Project lives in `downstairs/`.** The working dir already held an unrelated project (`wa-recap`), so the app is a subfolder with its own git repo.
- **Tailwind v4, tokens in CSS.** `@theme` with `--color-*: initial` wipes the default palette so only the spec's inks exist.
- **Fonts via Fontsource** (self-hosted, `font-display: swap`): Bowlby One, Caveat 600/700, DM Sans 400/500/700, Space Mono 400/700.
- **Tactile press is one CSS class (`.press`)**, used by every raised interactive element, so the signature behaviour stays consistent.
- **Café name/tagline/location are constants** in `shared/constants.ts`.
- **Illustrations share one `Ill` wrapper** (2.5px ink stroke, round caps) and a `RISO` offset for the tomato misregistration fill.
- **Phase 0 people art is original monoline, not Open Peeps.** The status scene figure is hand-drawn; swapping in Open Peeps is a later option.
- **Dev preview config** at repo-parent `.claude/launch.json` runs `npm --prefix downstairs run dev`.
