# Fragment 1 — launch-week fixes and milestone escrow

Commit range: `9775d3c88bda18b3eb11a9f1e9d73c28fdad1a3e` .. `15933f5cdd19ccac8d58c156555ffe3d04052f44` (2026-06-23 to 2026-06-26, 18 commits)

## X Thread

1/ Building Safeeely: AI-escrow for social media trades, freelance gigs & crypto deals. Register once on Telegram, Discord, WhatsApp, Instagram or Apple Messages, get one handle (a "safetag"), use it everywhere. Here's what shipped this week 🧵
2/ Started small: a 1px nudge on a balance chip. Then went straight into the deep end — self-service account block/reactivate, plus a real email+OTP web login so users aren't locked to a single bot platform.
3/ Then a nasty one: users logging in and getting instantly bounced back to /login. Root cause — a `void insert(...)` on a lazy Supabase query builder. It never actually fired. The session cookie was being issued for a session that didn't exist in the DB yet.
4/ Also swapped our placeholder square-and-shield logo for the real Safeeely wordmark across login, sidebar, and upload pages. Small thing, but it's the first thing users see — mattered more than the backend fix, honestly.
5/ Wired up PostHog across the API, the web app, AND all 6 bots — one funnel, one identity per safetag, no matter which platform someone uses. Also rebuilt Terms & Privacy pages pixel-exact to the new design.
6/ Biggest bug of the week: milestone transactions were finalizing the WHOLE project when just one phase got released. Money logic, not cosmetic. Rebuilt completion + dispute resolution to be strictly per-phase, with proper escrow math.
7/ That fix only covered Telegram/Discord. Turned out WhatsApp, Instagram, Messenger, and Apple Business needed the same parity pass — proof uploads tagged to the right phase, plain-English errors instead of raw codes, per-phase dispute flagging.
8/ Then the boring-but-critical stuff: WhatsApp notifications silently not sending because a phone number had a stray "+" in it. Buyers not getting payment prompts because of a 24h messaging window meant for marketing, not transactions.
9/ And a role-detection bug where buyers were shown seller-only buttons because `t.buyer_safetag` doesn't exist — it's nested as `t.buyer.safetag`. One typo-shaped bug, real money-flow consequences.
10/ Shipped a "resume TXN-XXXXXX" command across every bot, so a transaction can be picked up from any platform. Plus real payment logos (OPay, Flutterwave, ChainRails) replacing generic icons.
11/ Six platforms, one escrow engine, a lot of surface area to keep in sync. This was one week of it. Next chapter: the admin side of the house was next in line for a full rebuild.

## LinkedIn

A user's session cookie was being set for a database row that never existed. That one line cost me a night.

I'm building Safeeely — an AI-powered escrow platform for social media trades, freelance gigs, and crypto deals. The idea is simple: too many people are still sending money to strangers on the promise of "I'll deliver after." Safeeely holds the funds, both sides confirm, then it releases. You register once, get a single handle (a "safetag"), and use it across Telegram, Discord, WhatsApp, Instagram, or Apple Messages — same identity everywhere.

This past stretch of commits was equal parts feature work and hard lessons.

We shipped self-service account block/reactivate and a proper email+OTP web login, so people aren't stuck depending on one messaging platform to access their account. We swapped our placeholder logo for the real Safeeely wordmark — small, but it's the first thing anyone sees.

Then came the bug that actually scared me. Milestone-based transactions — the kind where a freelance job gets paid out in phases — were finalizing the entire project the moment ONE phase was released. That's not a UI bug, that's money moving wrong. I rebuilt the whole completion and dispute-resolution path to be strictly per-phase, with real escrow math behind it, and then found the same gap needed fixing across WhatsApp, Instagram, Messenger, and Apple Business too — features that "should" have had parity with Telegram/Discord but quietly didn't.

Somewhere in there I also chased down a role-detection bug where buyers were seeing seller-only buttons, because the code was reading `t.buyer_safetag` when the actual field was nested three levels deeper as `t.buyer.safetag`. One typo-shaped mistake, real consequences for real transactions.

We also wired PostHog analytics across the API, the web app, and all six bots, so we can actually see the user funnel instead of guessing at it — with one identity per safetag regardless of which platform someone showed up on.

The thing I keep relearning: when your product spans six different messaging platforms, "it works" isn't one fact, it's six facts you have to keep independently true. This week was mostly about closing the gaps between them.

More to come — the admin side of the house is next.

#buildinpublic #startup #escrow #fintech

## TikTok Voiceover Script

[hook, leaning into camera] A bug once logged users out the SECOND they logged in. Let me tell you what I'm building and how that happened.

[pause] This is Safeeely — escrow for the stuff that usually has none. Selling a social account, freelance work, crypto deals. Register once, get one handle, works on Telegram, WhatsApp, everywhere.

[show code/screen] That login bug — we were setting the session cookie before the database row even existed. Classic "the promise never fired." [laugh] Took way too long to find.

[beat] Bigger scare — paying one phase of a job released the WHOLE payment. Not cosmetic, that's money. Rebuilt it properly, then again for four more platforms.

[smile] Six platforms, one escrow brain. That's the job right now. More next time.
