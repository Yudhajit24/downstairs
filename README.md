# Downstairs

A small café inside a residential society (Palm Grove Residency, Bengaluru) gets slammed every morning, and orders were getting lost in chat messages. This is an order-ahead app for it: residents order from their flat, pick a time, and walk down when it's ready. The kitchen runs a live board on a tablet.

- Live: https://downstairs-hazel.vercel.app (the kitchen is at `/kitchen`, PIN shared separately)
- Repo: https://github.com/Yudhajit24/downstairs
- Demo mode is on, so the café counts as open at any hour and the menu has a small Demo row for faking rain, heat or a chilly day.

## What's in it

Customers get a menu with a Fit section for lighter, higher-protein picks, plus a build-your-own sandwich. They choose a pickup time with a clock and slider, and can pick any minute rather than a fixed slot. A bar under the slider shows where the kitchen has room and where it's full. After ordering there's a live status screen. They can edit or cancel until the kitchen starts, and once the order is picked up it shows how long the whole thing took and asks for a coffee-bean rating. There's also a poster and a song of the day, because a café app shouldn't feel like a form.

The kitchen board moves tickets from New to Preparing to Ready to Picked up, with undo, cancel-with-reason, stock and ingredient switches, a pause button, a chime and a wake lock. The header shows the day's average rating.

There are four AI features, all running on one open-weights model (gpt-oss-20b on Groq), and each one has a plain rule-based fallback so the app still works if the model doesn't:

- Ask for a pick: type "something light under ₹150" and get up to three items with a reason.
- Paste an order: drop in a WhatsApp-style message and get cart lines to review. It never places the order itself.
- Ask about your order: "how long?", "can I still cancel?" on the status page. Anything unrelated gets a polite redirect.
- Shift brief: a button in the kitchen drawer that says what to make first, what's due next and what's running low.

For the live integration I used Open-Meteo for weather. It changes the banner, the "Right now" row and the AI picks, along with the time of day and how busy the next few slots are. If the API is slow or down, those bits quietly drop out and everything else carries on. Because you can't order rain on demand, demo mode lets you simulate it.

## Decisions I'd defend

Capacity is counted in prep effort, not orders. Four coffees and one sandwich aren't the same load, so each item has prep units and each 15-minute window holds 16. Customers pick any minute and it counts against its window. A full window says so and offers the next free time.

The server enforces every rule. Prices, stock, capacity and the daily token number change in one transaction, so two people can't both grab the last croissant. Each order carries an id made on the client, which means a flaky connection and a retry can't create a duplicate.

You can edit an order only while it's New. Once the kitchen has started, changing it wastes food, so the screen says that and points to the counter. When someone does edit, the kitchen sees a flash and a list of what changed.

I don't trust the model with anything that matters. Code works out the facts and enforces budget, veg, stock and price. The model only picks and phrases, its output is checked against the real menu, and if anything goes wrong the rule engine answers instead.

I cut a "group order" share button late on. All it did was copy items into someone else's cart, which promised more than it delivered, so it went.

Every decision and the reasoning behind it is in [DECISIONS.md](DECISIONS.md).

## What was hard

Most of the effort went into the real-world cases: an item selling out mid-checkout, a slot filling while someone's picking it, edits racing the kitchen, double taps. About 230 tests cover those. Letting people choose any minute while the kitchen still plans around 15-minute windows was the trickiest rule change.

The AI parts were fiddly in a different way. Models invent items and return broken JSON, the first hosted model I picked got retired, and the one I ended up with spent its whole token budget thinking and sent back empty answers until I capped its effort. Validation and fallbacks are why none of that reaches a customer.

One upgrade of a dependency made every serverless function crash on Vercel until I pinned it back.

## What I'd do next

1. Try the kitchen on a real tablet. I've used the customer side on a phone, but the chime, vibration and wake lock have only been checked in a browser.
2. Real customer sign-in. Right now anyone with an order link can read that order.
3. Better rate limiting (it's in memory today) and a lockout on the PIN screen.
4. A push notification when an order is ready, so nobody has to stare at the screen.
5. UPI payments, plus end-to-end and accessibility tests.

## Rough edges

Dev and production share one database, and the nutrition numbers are estimates. The AI needs a network and a Groq key. Setup, scripts and architecture are in [docs/TECHNICAL.md](docs/TECHNICAL.md), [HANDOFF.md](HANDOFF.md) has the current state and open items, and [docs/AI_PROMPTS.md](docs/AI_PROMPTS.md) covers how I worked with AI on this.
