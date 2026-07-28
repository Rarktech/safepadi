# Day 6 — Admin dashboard launch, build break, and the instant-logout bug

**Commits covered:** `0423215033adf20bebf1b33117fb91ba31fd032d` → `1ef50903d114cad1497cb8b245d5f58d88e7721f` → `44c1bed822adc253085893e69696353bc6192b4a` (all June 27, 2026)

- `feat(admin): complete admin dashboard expansion — all 20 tasks`
- `fix(api): replace .catch() with .then(undefined, () => {}) on Supabase PromiseLike returns`
- `fix(admin): resolve auto-logout by persisting JWT in localStorage`

Delivered via Slack (#story-teller) on 2026-07-28.

---

## TikTok 1/3 — Building the whole admin back office in one sitting

[lean in] Okay, so here's something wild I did back in late June that almost nobody who actually uses Safeeely will ever see. [pause] I built an entire admin dashboard — in one sitting. Not one page. Ten brand new pages. A whole back office: a fraud queue, dispute assignment, revenue reports, a referral leaderboard, marketplace moderation, broadcast messaging. [show screen] Every deal moving through Safeeely — every dispute, every payout, every flagged listing — finally had a real cockpit behind it instead of me manually digging through the database by hand. [smile] I was so relieved to finally have this... until the bugs it created showed up almost immediately. [pause] That part's next.

## TikTok 2/3 — The algorithm behind dispute assignment

[pause] One of the quieter features I shipped that same day actually matters more than people would guess: how disputes get handed to my support team. [show code/screen] Before this, if a dispute got escalated, it just kind of... sat there, or went to whoever happened to notice it first. Now there's an algorithm — it checks every specialist's current caseload and hands the new case to whoever has the fewest open. [lean in] And if nobody touches it in 24 hours, it auto-reminds someone. At 72 hours, it escalates again. [smile] Sounds small. But it's the difference between waiting three days for a real human to see your case, or three hours. [pause] Building it that fast came with a cost though.

## TikTok 3/3 — The instant-logout bug

[pause] So I ship this massive admin dashboard, feeling great about it, and within days my own admins started getting randomly logged out. [look at camera] Not "session expired" logged out — instant, every single time they clicked something. [pause] Took me a minute to track down: the login was setting a cookie for one web address, but the page checking whether you were logged in was quietly running through a different address underneath. Same site, different door. The browser just never sent the cookie back. [show code/screen] Fix was simple once I actually found it — store the login token directly and attach it myself to every request. [smile] Tiny bug. Would've been a huge trust hit if it had sat there much longer.

---

## X 1/3

Late June: I sat down and built an entire admin back office for Safeeely in one sitting. 10 new pages — fraud queue, dispute routing, revenue reports, marketplace moderation, broadcast tools. Users never see any of it. But it's the reason the platform can actually be *run*, not just built.

## X 2/3

Added an algorithm that hands each dispute to whichever support specialist has the fewest open cases, then auto-reminds at 24h and escalates at 72h if nobody's touched it. Small thing. But it's the difference between "someone will get to you eventually" and "someone WILL get to you."

## X 3/3

Shipped that huge dashboard, felt amazing about it... then my own admins started getting logged out instantly. Turned out the login cookie was set for one web address while the login check quietly ran through a different one underneath. Browser just never sent it back. One of those "oh no" bugs that's actually a two-line fix.

---

## LinkedIn 1/2 — Narrative

*Back in late June, I built an entire company inside my company — and it took one sitting.*

Safeeely already had bots on Telegram, Discord, WhatsApp, Instagram, and Apple Business. Real users, real money moving through escrow every day.

What it didn't have was a way for *me* to actually run it.

Every dispute I had to eyeball manually. Every payout, every flagged listing, every piece of fraud — I was digging through raw database rows to find it. That doesn't scale past a handful of users, and I was already past that.

So I built the back office. In one push:

→ A dispute system that auto-assigns cases to whichever support specialist has the lightest load, and escalates if nobody responds in 24-72 hours
→ Finance dashboards — revenue waterfall, escrow exposure, refund liability
→ A fraud queue and trust score overrides
→ Marketplace moderation, referral leaderboards, broadcast messaging, a full analytics suite

Ten new admin pages. Dozens of new backend endpoints. Done.

I remember feeling genuinely relieved — like the platform had finally grown a nervous system to match its body.

That relief lasted about two days.

A small type error broke the production build. Then, worse: my own admins started getting logged out instantly, every time they clicked anything.

Turned out the login cookie was being set for one web address, while the page checking whether you were logged in was quietly running through a *different* address underneath the hood. Same site. Different door. The browser never sent the cookie back.

I fixed it by storing the login token directly and attaching it to every request myself instead of trusting the cookie to travel correctly.

Two bugs, same day, right after the biggest feature push I'd done solo up to that point. That's just what shipping fast looks like when you're building alone — you don't get the big win without also getting the two small fires that follow it.

I put both out before the day ended.

## LinkedIn 2/2 — Insight

*The feature your users will never see is often the one that saves your company.*

Late June, I shipped the biggest solo feature push I'd done on Safeeely so far: an entire admin back office. Ten pages. Fraud detection, dispute routing, finance dashboards, moderation tools.

Not one end user will ever open a single one of those pages.

And that's exactly the point.

Early on, it's tempting to think "building the product" means building what customers click. But every product that handles real money, real disputes, real trust between strangers, needs an invisible twin: the tooling that lets *you* actually operate it responsibly.

Before that back office existed, I was resolving disputes by manually reading database rows. That works at 10 users. It does not work at scale, and it definitely doesn't work while you're also in medical school.

Here's the part I didn't expect going in: shipping that much surface area in one day meant I also shipped its bugs in one day. A build-breaking type error. An authentication bug that instantly logged out my own admin team.

I used to think finding bugs that fast meant I'd moved too fast.

I don't think that anymore.

Moving fast and finding the cracks immediately is *far* safer than moving slow and having those same cracks surface three months later, in production, with real users' money sitting in escrow.

The bugs weren't the cost of speed. They were the receipt for it.

If you're building something people trust with money, build the control room before you need it — and expect to spend the same day fixing what it breaks.
