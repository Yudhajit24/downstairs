# How this was built with AI

Built with Claude Code (Claude Sonnet 5.5) over several sessions. The division of work, plainly:

- **The owner** set the product direction, chose what to build and what to cut, tried every change on a real phone and desktop, and sent back what was wrong, confusing or missing.
- **The assistant** wrote the code, the tests and the docs, ran the deploys, and reported what was and was not verified.

Below are the owner's messages from the final working session, verbatim (typos kept; screenshots noted; one API key redacted). The initial build from the written brief happened in earlier sessions, which are not reproduced here. A note after each says what it led to.

---

**1. Handing the project over to a fresh session**
> In the new chat, you can paste the prompt from my previous message. Or just tell it to read HANDOFF.md, README.md and DECISIONS.md in /Users/yudhajit/Desktop/WhatsappBot/downstairs first. Opening that chat in /Users/yudhajit/Desktop/WhatsappBot also lets it pick up my saved project notes. do this for the referene for the past project

→ Kept written handoff notes (HANDOFF.md, DECISIONS.md) so any session can resume with full context.

**2. Checking the brief against the build** *(screenshot of the brief)*
> brief me on this, everything is built right ? and how and what keep it short we are now moving towards wrapping this up

→ A requirement-by-requirement audit. It found the integration hard to demonstrate and that only one AI feature existed.

**3. Raising the bar**
> i want to build one more AI feature, also the current third party integraation is difficult to demonstrate. so need to change that

> (chosen from options) AI feature: "all 3." · Integration: "Weather with visible demo control"

→ Paste-an-order, order chat and a kitchen shift brief; a weather chip with a Live / Rain / Hot / Chilly demo switch.

**4. Making it real**
> yes, let make it real LLM backed and push the changes. tell me what do you need for the AI features and the 3rd party integration

> [Groq API key, redacted] this is the groq api key

> run ti

→ Hosted open-weights model wired in; deployed. (The key should be rotated after submission.)

**5. Real-device testing** *(screenshot of a failed checkout on the phone)*

→ Server logs showed the request never arrived: a one-off network failure, not a bug.

**6. Song of the day: what "play" should mean**
> works perfect, the song of the day just redirects to spotify or youtube. i want it to redirect and also play

> no no i dont want it to play on app, just how it is redirected to spotify or youtube it should play there only not just redirect it adn stand still

> not playing again just redirected *(screenshot of Spotify's logged-out page)*

→ First attempt embedded a player; the owner corrected the intent. Buttons now open the exact track, with autoplay requested. Spotify's logged-out limit was identified and documented.

**7. Final check against the brief** *(screenshot of the brief)*
> so everythiing here that has been asked is done right ?

> where is brief me ?

> tested it works fine

→ Gap list: README, chat log, walkthrough, repo access.

**8. One-page README**
> 1. One-page README: I'd rewrite it with the key product decisions and why, what I'd build next, and what was hard. The current detail would move to `docs/`. build this

**9. Product review from using the app** *(six screenshots)*
> remove this grp order thing, slightly make it confusing. and misleading. make the AI orders a bit better so that people only get releent answers and if irrelevent quetions are asked they simply tell to give questions related to cafe and order.
>
> customise option (for sugar quantity) filter coffee is not showing when adding to cart from this section
>
> pon sharing link I would suggest that you keep the order in sync rather than sharing order like a template or just remove this feature ot necessary though
>
> the last picture is not an oval completely
>
> i want the image details and source to be there not just after i tap, people need context of the art and nobody will tap to find out themsleves

→ Removed cart sharing; chat now redirects off-topic questions; quick-add opens the sugar choice; poster credit always visible and the image flush to its card. These were found by using the product, not from the spec.

**10. More feedback from using it** *(screenshots)*
> The artwork is same, why not keep them different

> once order is picked up done show 2 things. 1. How much total time it took from ordering to picking it up 2. A feedback for 5 stars and stuff just tap the stars not writing. keep the stars in the shape of coffee beans

> instead of slots just give them pick a timing of their choosing maybe a clock themed time picker or a slider, anything works. predetermined slots kind of lets them not pick timings as of their choic.

> I haven't made the kitchen see the ratings yet. They're saved in the data, but nothing displays them. [...] do this

> Keep non veg items on the menu as well, chicken specifically

→ Different poster per screen; time-to-pickup and coffee-bean rating; any-minute clock-and-slider picker (capacity still counted per 15-minute window); ratings on the kitchen board; five chicken dishes.

---

## What this shows

The owner's contribution was judgement about the product: seeing that a "group order" label over-promised, that a quick-add skipped a customer's sugar choice, that fixed slots took away choice, that two screens repeating one poster felt lazy, and that "play" meant "play on the service". The assistant's contribution was implementation and verification: it wrote the code and tests, ran the checks (including against the real model and database), deployed, and said plainly where something was unverified or a platform limit applied.

The full decision log, with the reason for each, is in [DECISIONS.md](../DECISIONS.md).
