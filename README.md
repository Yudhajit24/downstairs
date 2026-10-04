# Downstairs

Order-ahead for a small café inside a residential society (Palm Grove Residency, Bengaluru). Residents order from their flat and pick up without waiting; the kitchen runs a live board on a tablet.

- **Live:** https://downstairs-hazel.vercel.app (customer) · `/kitchen` (staff board, PIN shared separately)
- **Repo:** https://github.com/Yudhajit24/downstairs
- **Demo mode** is on: the café is "open" at any hour, and a Demo row on the menu simulates rain, heat or chill.

## What it does

**Customer (mobile-first):** menu in categories, cart, sugar options, a build-your-own sandwich, a clock-and-slider pickup time picker (any minute, with room/filling/full shown on the bar), name and flat, then a live order status. Edit or cancel while the order is still New; reorder. Once picked up it shows how long the order took and asks for a one-tap rating in coffee beans.

**Kitchen (tablet):** live board New → Preparing → Ready → Picked up with undo, cancel with reason, stock and per-ingredient switches, slot open/close, pause orders, chime and wake lock, and the day's average rating.

**AI (four features, one open-weights model, each with a no-AI fallback):**
- *Ask for a pick:* "something light under ₹150" → up to three items with a reason.
- *Paste an order:* a WhatsApp-style message becomes cart lines to review. It never places the order.
- *Ask about your order:* "how long?", "can I still cancel?" on the status page. It only answers about the order and the café; anything else gets a polite redirect.
- *Shift brief (kitchen):* what to make first, what is due next, what is running low.

**Live integration:** Open-Meteo weather (no key) shapes the banner, the "Right now" row and the AI picks, together with the time of day and how full the next slots are. If the API is slow or down, those parts quietly drop out and the app works as normal.

## Product decisions, and why

- **Capacity counts prep effort, not orders.** Each item has prep units and each 15-minute window holds 16, so four coffees and one sandwich are not the same load. Customers pick any minute; it counts against its window. A full window shows as full on the picker and offers the next free time.
- **The server owns every rule.** Prices, stock, slot capacity and the daily token are checked and changed in one transaction, so two people cannot both take the last croissant or the last slot. Orders carry a client-made id, so a dropped connection and a retry never creates a duplicate.
- **Edits are allowed only while an order is New.** Once the kitchen starts, changing it would waste food, so the screen says so and points to the counter. The kitchen sees a flash and a change list whenever a customer edits.
- **AI is never trusted with anything that matters.** Code computes the facts and enforces budget, veg, stock and price. The model only chooses and phrases. Its output is checked against the real menu, and any failure falls back to a rule engine that always answers.
- **Weather you can demo.** Real weather cannot be summoned on request, so demo mode adds a simulate switch that drives the same code path.
- **I cut what confused people.** A "group order" share button only copied items into someone else's cart, which read as more than it was, so it was removed rather than half-built.
- **Custom design, not a template:** a tactile riso-print look with a custom palette, hand-drawn illustrations, and a poster and song of the day for personality.

Every decision with its reason is in [DECISIONS.md](DECISIONS.md).

## What was hard

- **Concurrency and the real-world cases:** sold-out mid-checkout, full slots, edits racing the kitchen, double taps. This took most of the care, and about 230 tests cover it. Letting people pick any minute, while the kitchen still plans around 15-minute capacity windows, was the trickiest rule change.
- **Keeping the model honest:** models can invent items or return broken JSON (both are handled and tested), the first hosted model we picked was retired by the provider, and the reasoning model we ended on spent its whole token budget thinking and returned empty replies until I capped its effort. Validation plus fallbacks keeps all of that invisible to users.
- **A serverless gotcha:** a dependency upgrade made every function crash on Vercel until it was pinned back.

## What I would build next

1. Test the kitchen on a real tablet: the customer flow was tried on a phone, but the chime, vibrate and wake lock were only checked in the browser.
2. Real customer sign-in. Today anyone with an order link can read that order.
3. Proper rate limits (they are in-memory now) and a retry limit on the PIN screen.
4. A "ready" push notification, so customers do not need to watch the screen.
5. UPI payment, and end-to-end and accessibility tests.

## Honest trade-offs

Dev and production share one database. The nutrition figures are estimates. The AI runs on a hosted open model (Groq), so it needs that key and a network. Setup, scripts and architecture are in [docs/TECHNICAL.md](docs/TECHNICAL.md); [HANDOFF.md](HANDOFF.md) is the current state and open items.
