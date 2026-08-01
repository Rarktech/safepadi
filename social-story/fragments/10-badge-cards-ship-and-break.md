# Day 10 — Badge cards ship, then break, same day

**Commits covered:** `1739b8ab` → `f0432146` (June 30, 2026)
- `1739b8abb87855e1e9d699103783e871e8e69a47` — feat(badges): add badge card image compositing and award notifications
- `b2d71ff43720c79ee5fd69789987846040137535` — fix(badges): correct BADGES_DIR path in badge-card endpoint (3 levels not 4)
- `f043214623214bb2f66590fdaab40757f93f0f6c` — fix(badges): replace locked silhouettes correctly + rebuild API dist

Delivered via Slack (#story-teller) on 2026-08-01.

---

## TikTok 1/3 — Badges you can actually see

Ever wonder how you'd trust a total stranger on the internet with your money? [look at camera] That's the exact problem Safeeely exists to solve. [pause] So back at the end of June, I shipped something I was genuinely excited about — badge cards.

Every time someone completes a safe deal, keeps a clean streak, or moves real volume through the platform, they earn a badge. Early bird. Trusted seller. Zero drama. Whale buyer. [show code/screen] And instead of the bot just texting "congrats, you earned a badge" like some boring achievement popup — it sends an actual image. Your locked badges greyed out, your earned ones lit up in color, your trust score right there.

Across all six bots — Telegram, Discord, WhatsApp, Instagram, Apple. [smile] Built it in one sitting.

But shipping it was the easy part. [lean in] What happened right after was not.

## TikTok 2/3 — The badge that wouldn't disappear

I shipped a feature where your earned badges show up in full color and your locked ones stay grey and silhouetted. [pause] Except right after launch, I noticed something weird — badges you'd already earned were still showing the grey locked version bleeding through underneath the colored one.

[show code/screen] Turns out I'd built the grey "locked" layer to always render no matter what, and just stack the colored version on top when you'd earned it. Which is fine — until the layers aren't perfectly opaque, and the locked version peeks through the edges.

The fix was small once I saw it. [pause] Only draw the locked silhouette if the badge is actually still locked. That's it. One condition. [smile] But it's a good reminder — in something as visual as a trust badge, a bug doesn't crash your app, it just quietly makes you look sloppy. [look at camera] And that's almost worse.

## TikTok 3/3 — It worked on my machine

Same day I shipped badge cards, I fixed a visual bug... and then hit a way scarier one. [pause] Every single badge card request, across every bot, started throwing a 500 error. In production. For everyone.

[show code/screen] I checked the code. It was right. I checked the file path logic. Also right, mostly — there was a small path bug too, three folder levels instead of four. But that wasn't even the real killer. The real problem was that the production server was still running an old build. I'd fixed the code, but never rebuilt the actual files the server was serving. [pause] Classic "it works on my machine."

[lean in] Rebuilt it, redeployed, and just like that — badge cards were live and working, for real this time. [smile] Lesson that stuck with me: shipping the code isn't shipping the feature. [look at camera] Next chapter — badges weren't the only thing I had to go back and fix that week.

---

## X 1/3

End of June, I shipped badge cards for Safeeely.

Earn a badge — early bird, trusted seller, zero drama, whale buyer — and instead of a boring text notification, you get an actual composited image. Your badges, your trust score, sent straight into your DMs.

Across all 6 bots. Built in one sitting.

Then it broke.

## X 2/3

Shipped badge cards. Noticed the "locked" grey badge silhouette was still bleeding through behind badges people had already earned.

Turns out I was always drawing the locked version, then stacking the earned one on top.

Fix: only draw "locked" if it's actually still locked.

One condition. Should've been there from the start.

## X 3/3

Fixed the badge code. Every badge card request in production still 500'd. For everyone, on every bot.

The code was fine. The server was just still running the OLD build — I never redeployed it.

"It works on my machine" is a trap even when you own the machine.

Rebuilt it. Fixed for real.

---

## LinkedIn 1/2 — Narrative

I shipped a feature I was proud of. Then, within hours, three separate bugs made me question if I should've shipped it at all.

Back at the end of June, I built badge cards for Safeeely — the AI-escrow platform I run via Telegram, Discord, WhatsApp, Instagram and Apple bots for people trading social media accounts, freelance gigs, and crypto.

The idea was simple: when someone completes a deal safely, or hits a trust milestone, they earn a badge. Early bird. Trusted seller. Zero drama. Whale buyer. Instead of a plain "you earned a badge!" text, the bot now sends an actual image — a composited card showing every badge they've earned in color, the ones they haven't in grey, and their trust score front and center.

I built it, tested it locally, and shipped it across all six bots in one sitting. It felt good.

Then I looked closer and saw something off — badges I'd already earned were still showing a grey "locked" outline bleeding through behind the colored version. A rendering order bug. Small, but visible, and visible is exactly what a trust badge can't afford to be sloppy about.

I fixed that. And then hit something much worse: every badge card request, on every bot, started failing. In production. For every single user.

The code was right. There was a small file path issue too, but that wasn't the real cause. The real cause was that I'd fixed the code — but never rebuilt the production files the server was actually serving. The live server was still running old, broken code.

Rebuilt it, redeployed, watched the errors disappear.

Same day, three bugs, one feature. That's what building this alone, alongside med school, actually looks like — not a straight line, a scramble to catch what you missed before it costs someone trust in a platform built entirely on trust.

## LinkedIn 2/2 — Insight

"It works on my machine" is a trap even when you're the only one who owns the machine.

That's the lesson from a bug I hit while building Safeeely. I'd shipped a new feature — visual badge cards sent through the bot whenever a user earns trust milestones on the platform. I tested it locally. It worked. I pushed the code live.

And it broke. Completely. Every request, on every bot, failing.

The code itself was fine. What wasn't fine was that the server serving real users was still running an old, compiled version of the app — I'd changed the source, but never rebuilt the production files that actually get deployed. Two different things. I'd only fixed one of them.

Here's the broader lesson I keep relearning as a solo builder: "I fixed the bug" and "the fix is live" are not the same claim, and treating them as interchangeable is how you ship confidently broken software. The gap between them is invisible until a real user hits it — and by then it's not a code review comment, it's a support ticket.

Now I don't consider anything shipped until I've watched it work in the actual production environment, not just in my editor. Slower. But it's the only version of "done" that means anything to the person on the other end of the deal.
