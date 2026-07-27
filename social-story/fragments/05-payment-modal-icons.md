# Day 5 - Payment Modal Icons: Real Logos, Real Trust (and an 8-Minute Bug)

**Commit range:** `25dbcdb9d88e0fff0a8e6fed25fa9752572cde7b` → `15933f5cdd19ccac8d58c156555ffe3d04052f44`

**Commits covered:**
1. `25dbcdb` (June 26, 2026) - feat(frontend): replace payment modal placeholder icons with real provider logos
2. `e82dd61` (June 26, 2026) - fix(frontend): restore CreditCard import removed by mistake in previous commit
3. `15933f5` (June 26, 2026) - fix(frontend): increase OPay logo size in payment modal (30px → 42px)

---

## TikTok Scripts

### TIKTOK 1/3 - Day 5: Real Logos, Real Trust

[lean in] Quick one - would you trust a payment screen with a generic lightning-bolt icon on it? [pause] Yeah, me neither. Back in June, building Safeeely, our "choose how you pay" screen used placeholder icons standing in for OPay, Flutterwave, and our crypto rail. Functional, but it screamed "unfinished." [show screen] So one night I swapped every single one for the real brand logos. Same code underneath, same escrow protection - just now it looked like something you'd actually trust with your money. [smile] Tiny visual fix. But eight minutes later, that same "quick fix" came back to bite me. [pause, look at camera] That story's next.

### TIKTOK 2/3 - Day 5: The 8-Minute Bug

[pause] Nobody tells you "quick" fixes are never quick. [show code/screen] Right after swapping in the real payment logos for Safeeely, I went back and deleted the icon imports I figured were now dead weight - clean up the leftovers, right? [wince] Except one of them, the credit-card icon, was still being used further down that same page, on the platform-fee line. I hadn't checked. [pause] Eight minutes after shipping the nice version, I was shipping the broken version. Found it, fixed it, moved on. [look at camera] Same lesson every time though: the riskiest line in any commit is the one you were SURE was safe to delete. [smile]

### TIKTOK 3/3 - Day 5: Hot Take - Speed Isn't the Risk

[look at camera, direct] Hot take: if you're building solo and every commit doesn't make you a little nervous, you're moving too slow. [pause] The night I redid Safeeely's payment icons, I shipped three commits in twelve minutes. Add real logos. Break an import. Fix the import. Then bump a logo size. [fast cuts] People glorify "move fast and don't break things" like that's achievable for a one-person team building this alongside med school. It's not. [pause] What IS achievable is moving fast and catching your own breaks fast - eight minutes, not eight days. [lean in] Speed was never the risk here. Slow detection is. [smile]

---

## X Posts

### X 1/3 - Day 5

Would you hand over money on a payment screen with a generic lightning-bolt icon standing in for the real payment provider? Neither would I.

Back in June, building Safeeely, I ripped the placeholder icons out of our payment screen and dropped in the real OPay, Flutterwave, and crypto-rail logos. Same backend. Way more trust.

### X 2/3 - Day 5

Eight minutes. That's how long it took my own "cleanup" commit to break the payment page I'd just fixed.

I deleted an icon import I was SURE was unused. It wasn't - it was quietly holding up the platform-fee line at the bottom of the screen. Caught it, fixed it, shipped again.

### X 3/3 - Day 5

Building Safeeely solo (alongside med school) taught me this: fast shipping isn't the risk. Slow detection is.

Three commits, twelve minutes, one broke, one fixed it. That's not chaos - that's what building in public actually looks like when nobody's checking your work but you.

---

## LinkedIn Posts

### LINKEDIN 1/2 - Day 5 (narrative/journey)

It took exactly eight minutes to go from "this finally looks trustworthy" to "wait, why is the fee line gone."

Back in late June, a few days into really building Safeeely out, I sat down to fix something that had been bothering me for weeks.

Our "choose how you're paying" screen - the one thing a buyer sees right before they hand over real money to a stranger they met on Instagram or Discord - was using placeholder icons. A generic lightning bolt. A generic credit card. Generic layered squares standing in for OPay, Flutterwave, and our crypto rail.

Nothing wrong with them, functionally. But when actual money is about to move, "generic" reads as "unfinished." And unfinished reads as "don't trust this with your money."

So one night I swapped every placeholder for the real brand logos. Real OPay logo. Real Flutterwave icon. A custom mark for our crypto rail. Same backend, same escrow protection under the hood - just a screen that finally looked like something built by people who knew what they were doing.

I shipped it. It felt good.

Eight minutes later, I was back in the code - because in "cleaning up," I'd deleted an icon import I assumed was now dead weight. It wasn't. That same icon was still being used further down the page, on the platform-fee line. I broke it, caught it, and fixed it before anyone but me ever saw it.

Four minutes after that, I was back again - this time just to make the OPay logo bigger, because it looked cramped next to the others.

Three commits. Twelve minutes. One visual win, one self-inflicted bug, one polish pass.

That's what building something like this actually looks like when it's just you: no QA team, no second pair of eyes, just you shipping, breaking, and fixing your own work in the same sitting - over and over, for months.

### LINKEDIN 2/2 - Day 5 (insight/take)

Everyone says "move fast and don't break things." Building Safeeely alone taught me that's a lie.

There is no version of solo building where you don't break things. I've stopped believing anyone who says otherwise.

A few weeks into building Safeeely, I had a twelve-minute stretch that proved it perfectly: I shipped a genuinely nice visual upgrade to our payment screen - real brand logos instead of generic placeholder icons, which matters a lot more than it sounds like when the screen is asking someone to hand over real money.

Then, in that same "cleanup" pass, I deleted an import I was sure was dead code. It wasn't. I broke the platform-fee display on that exact page, eight minutes after fixing the thing next to it.

I used to think the goal was to not make that mistake. Now I think that's the wrong goal entirely - for a solo founder building something this size, alongside medical school, with no other engineer checking your diffs, mistakes aren't a failure state. They're the cost of shipping at all.

The actual skill isn't "write code that never breaks." It's shrinking the gap between breaking something and knowing it broke. Mine was eight minutes, because I went back and looked immediately instead of moving straight to the next task.

Slow detection is the real risk in solo building - not the bug itself. The bug you catch in eight minutes is a non-event. The bug you catch in eight days, after a real user hit it, is a trust problem.

If you're building alone: don't optimize for a diff you're 100% sure of. Optimize for how fast you circle back and check your own work.
