# Downstairs: handoff

A self-contained briefing for picking this project up in a fresh session (human or AI). Pair it with `README.md` (one-page overview), `docs/TECHNICAL.md` (how to run, env, scripts) and `DECISIONS.md` (every notable decision and why). It contains no secrets.

You are continuing work on **Downstairs**, an order-ahead web app for a small café inside a residential society (Palm Grove Residency, Bengaluru). It was built and extended over a long session; everything below is the verified state at handoff.

## Where things are

- Code: `/Users/yudhajit/Desktop/WhatsappBot/downstairs` (a subfolder; the parent also holds an unrelated project, `wa-recap`, to leave alone)
- GitHub: https://github.com/Yudhajit24/downstairs (branch `main`)
- Live: https://downstairs-hazel.vercel.app (customer) and `/kitchen` (staff board, 6-digit PIN)
- Vercel project: `downstairs`. Firebase project: `downstairs-735b1` (Firestore in `asia-south1`; Auth is custom tokens only)
- 217 unit tests pass (`npm test`); `tsc` is clean.

## What it is

**Customer view** (mobile-first, 320 to 440px): menu, cart, sugar options, build-your-own sandwich, pickup slots with capacity, place order, live status, edit/cancel while New, recent orders, reorder, shareable order links (`/t/:id`), a weather- and kitchen-load-aware "Right now" row, a "Fit picks" healthier section with approximate nutrition, "Ask for a pick", "Paste an order" and "Ask about your order" (AI through any OpenAI-compatible LLM, each with a rule-engine fallback), a weather chip with a demo simulate switch, poster of the day (Met Open Access CC0 busts in a riso duotone), and a song-of-the-day bar pinned at the very top of the menu.

**Kitchen view** (`/kitchen`, tablet): PIN gate, AI shift brief in the Tools drawer, live KOT board (New, Preparing, Ready, Picked up; tabs on narrow screens), undo toast, cancel with reason, stock and per-ingredient switches, slot open/close, 24-hour demo switch, kitchen banner, pause orders, chime, wake lock.

## Stack and architecture

Vite + React + TypeScript, React Router, Tailwind v4 (custom tokens only; the default palette is wiped), `motion`, Zod, `date-fns` + `@date-fns/tz`, Firebase (Firestore live reads from the browser).

All writes go through Vercel functions (**10 in total**, cap 12) using `firebase-admin` inside transactions (the cap is 12):
`POST /api/orders`, `PATCH /api/orders/[id]`, `POST /api/kitchen/session`, `POST /api/kitchen/action`, `POST /api/kitchen/brief`, `POST /api/templates`, `GET /api/weather`, `POST /api/assist`, `POST /api/parse-order`, `POST /api/order-chat`.

- `shared/`: types, Zod schemas, slot math in IST, pricing and option resolution, status machine, ticket timing, suggestions, assist rules, nutrition, songs, poster pick. Imported by both the client and the API.
- `api/_lib/`: core transactions on a small `Db`/`Tx` interface (Firestore in production, an in-memory store in tests), assist (LLM + validation), weather, templates, auth.
- `src/customer`, `src/kitchen`, `src/design` (primitives), `src/illustrations`, `src/posters`, `src/lib`.
- Business rules: prep-unit capacity (16 per slot), 10-minute lead time, stock decrement inside the order transaction, idempotent create via a client-generated 21-character id, every kitchen transition sends `expectedStatus`, prices only ever come from the menu.
- Demo mode: `settings.forceOpen` is ON (it also widens the slot grid to 24h). Toggle it in the kitchen: Slots drawer.

## Env and secrets (never print or commit)

`.env.local` (git-ignored) and Vercel hold: `VITE_FIREBASE_API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `APP_ID` (public by design), `FIREBASE_SERVICE_ACCOUNT_BASE64`, `KITCHEN_PIN`. Optional for AI: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`. Never put these in a `VITE_` variable or the client bundle. The downloaded service-account JSON was verified redundant and moved to the Trash; it was not rotated, by decision (see DECISIONS.md, "Service-account key handling").

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Frontend plus `/api` together (a dev-only Vite plugin; no `vercel login` needed) |
| `npm test` | Vitest |
| `npm run seed` | Writes the menu and `settings/cafe` |
| `npm run reset-demo` | **Destructive:** wipes orders, slots, counters and templates, then reseeds. Dev and prod share one database. |
| `npm run live-check` | Core scenarios against real Firestore, then reseeds |
| `npm run deploy-rules` | Publishes `firestore.rules` through the Admin SDK |
| `npm run posters` | Rebuilds the poster images |

Deploy with `npx vercel deploy --prod --yes`. The Vercel CLI was logged in via the device flow; a deploy once reported a transient "error" and the immediate retry succeeded. The GitHub CLI is installed but not logged in; plain `git push` works. Vercel has no git integration, so deploys are manual. The preview launch config is named `downstairs` in `/Users/yudhajit/Desktop/WhatsappBot/.claude/launch.json`.

## Hard-won gotchas

- `firebase-admin` must stay on **13.x**. v14 pulls an ESM-only `jose` and every function crashes on Vercel with `ERR_REQUIRE_ESM`.
- Only function files may live directly under `api/` (Vercel turns each into a function). Tests go in `api/_lib/`.
- Relative imports in `shared/` and `api/` use `.js` extensions (Vercel ESM). Vite, Vitest and `tsc` map them back.
- Slots are today-only (IST), and a slot past midnight is a VALIDATION error. Order ids must be exactly 21 characters.
- macOS `sed -i` needs `''` and silently fails on awkward patterns; prefer `python3` for multi-line edits, and verify the edit applied.
- In the browser pane: coordinate clicks do not map, so use JS clicks or element refs. React inputs need the native value setter plus an `input` event. `requestAnimationFrame` is throttled when the pane is hidden, so animation timing cannot be measured there (screenshots force a render).
- Time-of-day-sensitive tests have bitten twice (late-evening slot counts). `live-check` is now hour-proof; keep new checks that way.
- The Met retired its v1 search API on 2026-10-01 (use v1.1) if posters are ever rebuilt.

## How the owner likes to work

Phase by phase with an honest summary after each: what was verified, what was not, and any deviations. Detailed commit messages with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; push to `main`; deploy when asked or when a change is user-facing. Ask before adding dependencies. Confirm before outward-facing or irreversible actions. Test in the browser at 375px (customer) and 1024x768 (kitchen) and clean up test data afterwards (`npm run reset-demo`). Keep `DECISIONS.md` updated with a line per notable decision and why.

## Known open items (the owner said "start wrapping it up")

1. **Real-device test** on a phone and a tablet: chime, vibrate, wake lock (iPad needs iOS 16.4+) and scroll feel were never tested on hardware. The scroll-smoothness work (no blend modes on the grain and halftone, eased chip scrolling) is based on known causes, not measured.
2. **All four AI features** were only tested against mock OpenAI-compatible servers (unit tests), never a real model. The kitchen Tools drawer (shift brief) UI was not exercised in a browser. The owner planned to supply an open-source LLM. A Vercel function cannot reach `localhost`, so production needs a hosted provider (Groq, Together, OpenRouter) or a tunnel: set the three `LLM_` variables with `vercel env add`, then redeploy.
3. **Rate limits** are best-effort and in-memory: assist 6/min and 40/hour per IP; templates have none beyond id dedupe; the kitchen PIN only has an 800 ms delay on a wrong PIN.
4. **Content to review:** the nutrition numbers are estimates (labelled "approximate"); the 14 songs were chosen from memory (links are search URLs, so small mistakes are harmless).
5. The owner should **empty the Trash** (it holds the old Firebase key file) and confirm the GitHub repository's visibility.
6. The customer bundle is about 306 KB gzipped (mostly Firestore). There are no component or end-to-end tests and no screen-reader audit; the edge-case matrix (section 11 of the original spec) was walked manually.
7. Optional: make the song bar sticky (one class); connect Vercel to GitHub for auto-deploys.

## First steps in a new session

Run `git status` and `npm test` to confirm the baseline, skim `DECISIONS.md`, then ask the owner which wrap-up item to take first. Do not start new features unprompted.
