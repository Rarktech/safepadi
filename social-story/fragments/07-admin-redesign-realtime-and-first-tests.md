# Day 7 — June 30, 2026: The redesign, the heartbeat, and the first test suite

**Commit range:** `44c1bed822adc253085893e69696353bc6192b4a`..`559973d5829a757ddeae697977736c7c5fe085cd`
(single commit: `559973d5829a757ddeae697977736c7c5fe085cd` — "feat(admin): complete admin panel redesign, test suite, and login fix")

---

## TikTok 1/4 — One day, 26 pages, one design

You know that feeling when your app looks like five different projects stitched together? [pause] That was my admin dashboard back in June. [show screen] Twenty-six back office pages — fraud queue, disputes, finance, marketplace moderation — all built fast, all built separately, all looking slightly different from each other.

[lean in] So on June 30th I stopped adding features for a day and just... fixed it. One navy color scheme. One shared header. One shell wrapping every single page so they'd finally feel like ONE product instead of twenty-six little experiments taped together.

[smile] It sounds boring. It was the most satisfying day I'd had in weeks. [pause] But the redesign wasn't even the part that scared me that day.

## TikTok 2/4 — Giving the dashboard a heartbeat

I gave my admin dashboard a heartbeat. [pause, look at camera]

Before June 30th, every back-office page on Safeeely was frozen the second it loaded. New dispute comes in? You don't know until you hit refresh. Fraud flag pops up? Refresh. It's an escrow platform — money is moving every minute — and my own team was staring at stale screens.

[show screen] So that same day I wired the whole admin panel into Supabase's real-time system. Now disputes, transactions, everything — updates live, on screen, the second it happens. No refresh button. No guessing if you're looking at "now" or "ten minutes ago."

[smile] Small line of code. Completely changed what it felt like to actually run this thing day to day.

## TikTok 3/4 — Four months, zero tests

Zooming out for a second. [pause] Four months into building Safeeely solo, and until June 30th, I had zero automated tests. None.

[look at camera] Every feature — the escrow logic, the milestone payments, real money moving between real strangers — I checked by hand, every time, hoping I hadn't missed a spot. That's just what building alone under a deadline looks like.

[pause] That day, same sitting as the admin redesign, I finally wrote sixty-six automated tests. Login flows, admin routes — the stuff guarding people's money.

[soft smile] Didn't feel like progress. No new button, no new screen. But it was the first day this started feeling built to last.

## TikTok 4/4 — The second login bug

Three days after I fixed a login bug that was locking admins out — I found ANOTHER one. [pause] Same page. Different bug.

[show screen] Turns out the admin login was calling the API through the wrong URL entirely — bypassing the proxy that was supposed to route the request cleanly. It technically "worked" most of the time, which is the scariest kind of bug, because it fails exactly when you're not looking.

[lean in] Fixed it in one line — route it through the relative path, let Next.js's own proxy handle it. [pause]

Two login bugs in the same week taught me something: auth is never "done." You don't fix it once. You just keep finding the next way it was quietly wrong.

---

## X 1/4

June 30, 2026: my Safeeely admin dashboard had grown to 26 pages, all built at different times, all looking slightly different from each other. Fraud queue looked nothing like the finance page. Finance page looked nothing like disputes.

Spent a full day giving all 26 one consistent design. No new features. Just made it look like one product instead of 26 experiments.

## X 2/4

Every admin page on Safeeely used to be frozen the moment it loaded. New dispute filed? You wouldn't know without hitting refresh.

On June 30 I wired the whole back office into real-time updates. Now it just... updates. Live. As it happens. On an escrow platform, that's not a nice-to-have, that's how you actually catch problems in time.

## X 3/4

Four months into building an escrow platform that moves real people's real money, and I finally wrote my first automated tests on June 30.

66 of them. Login flows, admin routes, the stuff guarding people's money.

No new feature that day. Just the first day it felt built to last instead of built to survive.

## X 4/4

Fixed an admin login bug on June 27. Found a completely different admin login bug on June 30.

Same page. New way it was quietly broken. That's the actual lesson from building auth solo for 4 months: you don't fix login once. You just keep finding the next way it was wrong.

---

## LinkedIn 1/2 — The narrative

By late June, my admin dashboard for Safeeely had a problem nobody could see from the outside.

It worked. Every page did its job — the fraud queue, the dispute tool, the finance view, the marketplace moderation panel. Twenty-six pages in total, each one built during a different late night, each one solving a different fire.

But they didn't feel like one product. They felt like twenty-six.

Different headers. Different spacing. Different shades of the same blue. The kind of thing a user might never consciously notice — but the kind of thing that quietly tells you, the builder, that speed has started costing you something.

So on June 30th, I did something that felt almost uncomfortable for a solo founder on a deadline: I didn't ship a single new feature. I spent the entire day making the existing 26 pages agree with each other. One navy design system. One shared header and shell. One consistent shape, page to page.

In that same sitting, I also wired the whole admin panel into real-time updates, so disputes and transactions show up the instant they happen instead of waiting for someone to hit refresh — which matters a lot more when the thing moving is real money.

And then I did the part I'd been putting off since day one: I wrote my first real automated tests. 66 of them, covering login and the core admin routes.

No demo-able progress that day. Nothing to screenshot for a highlight reel.

But it was the day Safeeely stopped feeling like a fast collection of fixes, and started feeling like something built to actually hold weight.

## LinkedIn 2/2 — The insight

Four months into building Safeeely solo, I hit zero automated tests. Not "low coverage." Zero.

Every feature — including the logic that decides who gets paid and when, on a platform built to hold strangers' money in escrow — I was verifying by hand, every single time, hoping I hadn't missed a spot.

I don't think that makes me careless. I think it makes me an honest solo builder on a deadline. Tests take time you don't have when you're racing to ship the next thing users are asking for. It's an easy corner to cut, and almost everyone building alone cuts it, at least at first.

Here's the conviction I landed on after finally writing that first batch of 66 tests: speed and consistency are not the same kind of progress, and only one of them compounds.

Shipping fast gets you features. It does not get you a system you can keep changing safely six months from now. Every untested piece of logic is a small, silent bet that you'll remember exactly how it works the next time you touch it. That bet gets worse, not better, as the codebase grows.

The uncomfortable part isn't writing the tests. It's the day you choose to write them instead of the feature your users are waiting on — and trust that the tradeoff pays off later, when you can't see the proof of it yet.

For anyone building something that touches real money, real trust, or real stakes: the day you stop and build the safety net is not a wasted day. It's the day your future self stops firefighting and starts building.
