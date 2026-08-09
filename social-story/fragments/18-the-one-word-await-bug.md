# Day 18 - The One-Word Await Bug

**Commit range:** `4ab26109b918538e1e2984ad83c2e72e83ac8789` (fix(api): await finalizePaySeller in adverse-inference dispute enforcement, July 5, 2026)

---

## TikTok 1/2 - The One-Word Bug

[lean in] Here's a bug that could've taken my whole server down — and it was one missing word. [pause]

Back in July, I was deep in Safeeely's dispute system — the part of the app that auto-decides a trade dispute if someone just goes silent and ignores their deadline. When that deadline passes, the code has to process it, and sometimes that means paying the seller.

[show code] I had two versions of that payment step, basically twins. One correctly waited for the payment to fully finish before moving on. The other didn't — it just fired it off and kept going. [pause]

Most days, invisible. Nobody notices. But the one time a bunch of disputes hit their deadline in the same minute, every one of those payment chains fired at once, unthrottled. My server's memory jumped 400 megabytes in seconds. [pause]

One missing word: await. [look at camera] And it wasn't even the first time I'd chased this exact ghost...

## TikTok 2/2 - Same Bug, Third Time

[pause] Hot take: the most dangerous bugs in your code aren't the ones you don't understand — they're the ones you already fixed somewhere else. [lean in]

This was the THIRD time in a few weeks I found basically the same shaped bug in Safeeely. Code that looked totally safe, ran fine 99% of the time, and only broke under real concurrent load. [show screen]

Same root cause every time — something not properly waited on, or not throttled, so it ran wild the one moment traffic actually spiked instead of trickling in like it does in testing.

It's so tempting to just fix the one spot and move on. [pause] But if you've found the same shaped bug twice, that's not a typo — that's a pattern in how you write code under pressure.

[look at camera] Building this solo, at 1am, between exams — you don't get a team to catch this stuff for you. You have to start catching yourself.

---

## X 1/2

Missing one word — await — in Safeeely's dispute code. On the one day a batch of disputes crossed their deadline at the same time, my server's memory spiked 400MB+ in seconds. All because a payment step got fired off without waiting for it to finish. One line. Huge blast radius.

## X 2/2

This was the 3rd time I found the same shaped bug in Safeeely — code that runs fine until real concurrent traffic hits it. Fixing the one spot isn't enough. If you've seen the same failure twice, it's a pattern in how you code under pressure, not a one-off typo.

---

## LinkedIn 1/2 - The Night One Word Almost Took Down the Server

One missing word in my code could have taken down my server.

Late one night in July, I was in the part of Safeeely that handles trade disputes automatically. If someone ignores a dispute — doesn't submit evidence by the deadline — the system rules against them without a human ever touching it. Sometimes that ruling means paying the seller immediately.

I had two versions of that "pay the seller" step, almost identical, sitting in sibling functions. One correctly waited for the payment to fully complete before moving to the next thing. The other didn't. It just fired the payment off and moved on, not waiting to see if it even finished.

On a normal day, you'd never notice. One dispute expires, one payment fires, done.

But disputes don't always expire one at a time. If a batch of them cross their deadline in the same cron cycle — which happens — every single one of those un-awaited payment chains fires at once. All at the same time. Fully concurrent. No throttle.

That night, it spiked my server's memory by over 400MB in seconds.

The fix was one word: await. Make it wait its turn instead of racing every other one.

It's a strange thing, building a platform that holds real people's money, almost entirely alone. The gap between "looks fine" and "quietly dangerous under load" can be a single keyword you didn't type. I found this one before it found me — but it's a reminder I don't get to stop checking.

## LinkedIn 2/2 - Your Second Identical Bug Isn't Bad Luck

The bug that should worry you most isn't the one you don't understand. It's the one you already fixed — somewhere else.

This was the third time in a few weeks I caught the same shaped bug in Safeeely. Different files, different features, same root cause: code that looked completely safe, passed every casual test, and only broke once real concurrent load hit it for the first time.

Here's the pattern I kept missing: when you're moving fast and building solo, you write a function, it works, and later you write something similar — a "sibling" — by copying the shape of the first one. Most of the time that's fine. But if the original had a subtle safety property (waiting for something to finish, limiting how much runs at once), and you don't consciously carry that property over, the copy quietly loses it. It still looks right. It still works in every normal case. It just isn't the same.

The first time I found this kind of bug, I treated it as a one-off typo and moved on. The second time, same thing. It wasn't until the third time that I stopped and asked: is this actually the same mistake, wearing a different filename?

It was.

The real fix wasn't just patching that one line — it was going back and grepping my own codebase for the shape of the mistake, not just the specific instance of it.

If you're building something alone, under time pressure, this is the lesson I'd hand you early: your second bug of the exact same shape isn't bad luck. It's data about how you code when you're tired. Start treating it that way before your users have to.
