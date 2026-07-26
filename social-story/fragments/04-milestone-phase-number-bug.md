# Day 04 — Milestone phase-numbering bug

**Commit range:** 7d20bcfc34d28d236df69e82c92104659d594550 (single commit)
**Date:** June 26, 2026
**Commit:** fix(api): use milestone.index_num for phase labels instead of unsorted array position

---

## TikTok Scripts

### TikTok 1/2 — "Phase 3 instead of Phase 1"

Back in late June, a buyer on Safeeely messaged me kind of panicked. [pause] He'd just paid the FIRST installment of a three-part milestone deal. The email he got back said "Phase 3 Released." [look at camera] His money was completely fine — the label was just lying to him. Turned out my code was guessing which phase number to show by counting where that milestone sat in a list the database handed back. [show code/screen] Problem is, databases don't promise to give you rows back in the order you expect. So sometimes phase one landed at position three, and the email just repeated that wrong number. [pause] Fixed it by reading the actual phase number stored with the milestone instead of guessing from list order. Small line. Real trust hit if I'd never caught it. [lean in] And two lines under that fix... there was a second number lying to people too.

### TikTok 2/2 — "Milestone 0 of 3"

Right next to that phase bug, I found this. [show code/screen] The email that goes out when a milestone gets released said, and I quote, "Milestone 0 of 3 Released." [pause] Classic programmer thing — in code, counting starts at zero. But no real person wants to open their inbox and see they just finished "milestone zero" after actually doing real work. [smile] One line fix: bump the number up by one before it ever reaches a sentence a human reads. It sounds tiny, almost funny, but on a platform literally built to make people trust it with their money, "milestone zero" is exactly the kind of thing that makes someone screenshot it and ask "wait, is this broken?" [look at camera] Next up — the icons on the actual payment screen had their own chaos.

---

## X Posts

### X 1/2

A buyer on Safeeely finished paying the FIRST installment of a 3-part milestone deal.

The confirmation email said "Phase 3 Released."

His money was fine. The label wasn't.

The bug: my code guessed the phase number from the order the database happened to return rows in, instead of reading the number actually stored with the milestone.

One line. Real fix. (June 26, 2026)

### X 2/2

Found a second bug hiding two lines under that one: the "milestone released" email literally read "Milestone 0 of 3."

Programmer math strikes again — code counts from 0, humans count from 1.

Nobody wants to be told they finished "milestone zero" after real work and real money moved.

---

## LinkedIn Posts

### LinkedIn 1/2 — Narrative

A user's money was never at risk. The email he got made him think it was.

Back in late June, a buyer on Safeeely paid the first installment of a three-part milestone deal — a freelance project split into phases, funds released bit by bit as work got approved.

He paid phase one. The confirmation email told him "Phase 3 Released."

Nothing about the transaction was wrong. But if you're a buyer watching your money move through an escrow platform, seeing a number that doesn't match what you just did is terrifying. For a second, so was I, reading his message.

The cause was almost embarrassingly simple. My code was figuring out "which phase is this" by checking where the milestone sat inside a list returned from the database — not by reading the actual phase number that had been stored with it since creation.

Databases don't guarantee they'll hand you rows back in the order you inserted them. Mine didn't, that day. So a milestone that was logically "phase one" could land third in the list, and the notification just repeated that wrong position back to the user as if it were true.

The fix was two lines: stop inferring the number, start reading it.

But the real lesson was bigger than two lines. When you're building something that touches people's money, the small, "cosmetic" bugs carry the same weight as the big ones. A wrong label is still a broken promise to whoever's reading it.

### LinkedIn 2/2 — Insight

Here's a rule I learned the expensive way while building Safeeely: never let a list's order stand in for the truth.

The bug was small on paper. A milestone payment notification showed the wrong phase number, because my code assumed "this item's position in the list I got back" was the same thing as "this item's actual sequence number."

It isn't. Not in a database, not in most systems. Order is a coincidence of how data happens to come back to you, not a fact you can build logic on. The moment you treat implicit order as meaningful data, you've written a bug that's just waiting for the day the order changes.

On most software, that kind of bug is an annoyance. On a platform where the whole product is "trust us with your money mid-transaction," it's worse than an annoyance — it's a crack in the thing you're actually selling, which isn't code, it's confidence.

The fix cost two lines. The insight cost me remembering, again, that in fintech-adjacent products the bar for "boring correctness" is higher than almost anywhere else. Nobody notices when the numbers are right. Everybody notices the one time they're wrong.

Build for the moment someone screenshots your app and asks "is this broken?" Because eventually, someone will.
