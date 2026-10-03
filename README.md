# Downstairs

Order-ahead web app for a small café inside a residential society (Palm Grove Residency, Bengaluru). Residents order from their flat, pick a pickup slot and track the order live; the kitchen runs a live board on a tablet.

- **Customer view** (mobile-first): menu, cart, sugar options, pickup slots with capacity, place order, live status, edit/cancel while New, recent orders, reorder.
- **Kitchen view** (`/kitchen`, tablet landscape): PIN gate, live KOT board, status changes with undo, cancel with reason, stock and slot controls, pause new orders, chime, wake lock.
- **Poster of the day:** a daily riso-duotone art card (public-domain busts with pop accessories).
- **Song of the day:** a daily track on the menu's "today" row, next to the poster (swipe sideways). One song for the whole society per IST day; tap it to open the card with Spotify and YouTube links.
- **Shareable order templates:** share any cart or order as a `/t/<id>` link that drops the same items into a friend's cart.
- **"Right now" suggestions:** picks from the weather (Open-Meteo), the time of day and how full the next pickup slots are. When the kitchen is busy it leads with grab-and-go bakes.
- **Fit picks:** a healthier section (light and high-protein) with approximate nutrition and filters.
- **Build Your Sandwich:** Subway-style customisation (bread, fillings, extras, sauce) with live pricing, min/max rules and ingredient availability the kitchen can switch off.
- **Ask for a pick (AI):** free-text suggestions, answered by an open-source LLM when configured and by a rule engine otherwise.

## Live

**https://downstairs-hazel.vercel.app** (customer) · **/kitchen** (PIN gate; the PIN is the `KITCHEN_PIN` env var).

Deploy: `npx vercel deploy --prod`. Set the six env vars first (`vercel env add`); the `VITE_` ones are baked in at build time.

## Run it locally

```bash
npm install
cp .env.example .env.local     # fill in the values (see below)
npm run seed                   # menu + settings (forceOpen: true)
npm run dev                    # frontend + /api together at http://localhost:5173
npm test                       # Vitest
```

`npm run dev` serves `/api/*` from the same handler files Vercel runs (a dev-only Vite plugin), so no `vercel login` is needed. `vercel dev` also works once you are logged in.

Open `/styleguide` for every design primitive and illustration.

### Environment

| Variable | Where | Notes |
|---|---|---|
| `VITE_FIREBASE_*` | client | **Public by design.** The Firebase web config identifies the project; it is not a secret. Security comes from Firestore rules and server-side writes. |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | server only | base64 of the service-account JSON. Never `VITE_`-prefixed. |
| `KITCHEN_PIN` | server only | 4–6 digits. Compared in constant time; wrong guesses are delayed. |

### AI picks: connect an open-source LLM (optional)

`POST /api/assist` works with **no configuration** (a tested rule engine answers). To use a model, set three server-only env vars for any **OpenAI-compatible** chat-completions endpoint:

| Variable | Example |
|---|---|
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1`, `https://api.together.xyz/v1`, `https://openrouter.ai/api/v1`, or `http://localhost:11434/v1` (Ollama) |
| `LLM_MODEL` | `llama-3.1-8b-instant` (Groq), `meta-llama/Llama-3.1-8B-Instruct-Turbo` (Together), `llama3.1:8b` (Ollama) |
| `LLM_API_KEY` | the provider's key (not needed for a local Ollama) |

The model's answer is treated as untrusted: only ids of items that are in stock and satisfy the budget and veg constraints in the request survive; reasons are sanitised; any error, timeout or bad JSON falls back to the rules. Requests are rate limited (6/min per IP) and cached for 5 minutes.

**Deploying:** a Vercel function cannot reach `localhost`, so for production use a hosted provider (or a tunnel to your own Ollama). Add the three variables with `vercel env add`.

### Scripts

| Script | What it does |
|---|---|
| `npm run seed` | Writes the menu and `settings/cafe` (`forceOpen: true`). Overwrites menu stock. |
| `npm run deploy-rules` | Publishes `firestore.rules` via the Admin SDK. |
| `npm run live-check` | Runs the core scenarios against **real** Firestore, then re-seeds. |
| `npm run reset-demo` | Wipes orders, slots and counters and reseeds. **Destructive.** |
| `npm run posters` | Rebuilds the poster images from the Met's open-access collection. |

## Demo mode

`settings.forceOpen` is **on** in the seed so a reviewer can order at any hour. It also widens the slot grid to the whole day. Toggle it in the kitchen: **Slots → Open 24 hours (demo)**. With it off the café is open 07:00–22:00 IST.

## How it is built

- Vite, React, TypeScript, React Router, Tailwind v4 (custom tokens only), `motion`, Zod, `date-fns` + `@date-fns/tz`.
- **Reads** are live Firestore listeners from the browser. **Writes** go only through four Vercel functions using `firebase-admin`, so every rule runs inside a Firestore transaction on the server:
  `POST /api/orders` · `PATCH /api/orders/[id]` · `POST /api/kitchen/session` · `POST /api/kitchen/action`
- Shared code (`/shared`): types, Zod schemas, slot math (IST), pricing, status machine, ticket timing, poster pick.
- Business logic runs on a small `Db`/`Tx` interface, with Firestore in production and an in-memory store in unit tests.
- Capacity is counted in prep units; stock, slot units and the daily token counter change in the same transaction as the order.

See [DECISIONS.md](DECISIONS.md) for every notable product and technical decision and why.

## Security notes and known trade-offs

- Anyone holding an order link can read that order (name and flat). Ids are 21-character nanoids, which are unguessable; this is acceptable for an MVP inside one society. Real customer auth would fix it.
- The kitchen signs in with a PIN exchanged server-side for a Firebase custom token carrying `staff: true`. There is no rate limiter beyond a short delay on wrong PINs.
- Firestore rules: public read for menu, settings and slots; order `get` is public by id, `list` needs the staff claim; every write is denied from clients.

## Testing

- `npm test`: slot math (IST, lead time, cart-relative capacity, closed slots, `forceOpen`), status transitions, pricing and diffs, ticket timing, poster pick and greeting, the order transactions (create, sold out, slot full, idempotent retry, races, edit, locked edit, cancel, kitchen actions) and the HTTP handlers.
- `npm run live-check`: the same core scenarios against real Firestore.

## Credits

- **Poster artwork:** public-domain objects from [The Metropolitan Museum of Art Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access) (CC0 1.0), cropped and recoloured to a duotone. Each poster's object, source URL and licence are recorded in `src/posters/posters.json`. Objects: Marble head of Athena (248642), Marble head of a god, probably Dionysos (251347), Marble head of a youth (248901, 255422, 248311, 250744), Marble head of a woman (254639, 250655), Marble bust of a man (248722, 251198), Terracotta head of Dionysos (248106), Marble head of Athena, the so-called Athena Medici (258077), Marble head of Aphrodite? (251515).
- Pop accessories (sunglasses, headphones, chai glass, steam) and all item and scene illustrations are original.
- Fonts via Fontsource: Bowlby One, Caveat, DM Sans, Space Mono (all OFL).
- **Song of the day:** a short list of well-known tracks in `shared/songs.ts`. We only link to Spotify/YouTube searches, host no audio, and quote no lyrics. The one-line blurbs are our own.
- Open Peeps (Pablo Stanley, CC0) is not used; the scene figures are original line drawings.
