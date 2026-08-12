# Day 21 — The fix that doubled friction, and the balance that lied

**Commits covered:** `b57767f659d9d112c617d800c8c88b4347176302` → `e241b10e3e4a808f8a814820f5afad1147f17620` (both July 6, 2026)

- `fix(api): grant payout_method scope alongside withdraw elevation`
- `fix(api): exclude FAILED withdrawals from available balance`

Note: these two commits landed on main right after the backfill cutoff commit (`984a832`) but were bypassed by the story system's own scaffold commit — they never got narrated until this run. No other unprocessed real commits exist between the cutoff and current `origin/main` HEAD; every other commit in that range is this job's own `chore(social-story)`/`feat(social-story)` infrastructure, which is intentionally excluded from narration.

---

## TikTok 1/2 — The fix that doubled the friction

The night I finally fixed my withdrawal bug, I broke it again. Not the same bug — a new one, hiding right behind it. [pause]

Back in July, I'd just shipped a fix so people could actually withdraw their money without getting stuck. Huge relief. [exhale] Then I looked closer at the flow.

Withdrawing money on Safeeely sometimes means adding a new bank account first — one screen, one tap, feels like one action to the user. But under the hood, I had it wired as TWO separate "prove it's you" checks. Save the account, verify. Withdraw, verify again.

So the fix I was proud of was quietly making people verify themselves twice for something that felt like one thing. [look at camera]

I merged the two into a single check. One proof, both steps done.

Lesson that keeps repeating on me: fixing the loud bug is easy. Finding the quiet one your own fix left behind — that's the real job.

## TikTok 2/2 — The balance that lied

Imagine your bank showed your balance going down for money that never actually left your account. That's the bug I found that same week. [pause]

On Safeeely, if a withdrawal failed on the payment provider's side — like their system rejected it — the money never moved. It just... stayed with the user. It should've stayed showing in their balance too.

But my balance calculation didn't know the difference between "this payout succeeded" and "this payout failed and nothing happened." Both looked the same to it. So a failed withdrawal quietly erased itself from what people saw as their available balance. [show code/screen]

Nobody's money was ever gone. But if you're building something people trust with their money, "your balance looks wrong" is basically the scariest sentence a user can send you. [lean in]

Fixed it the same night. But that message stuck with me — because on an escrow app, trust isn't a feature. It's the whole product.

---

## X 1/2

Shipped a fix so people could finally withdraw money without getting stuck.

Hours later I found the fix itself had a flaw: saving your bank account and confirming the withdrawal — one action to the user — was quietly asking them to verify their identity twice.

Merged it into one check. July 6, 2026.

## X 2/2

Found a bug where a withdrawal that FAILED (money never left the user) was still disappearing from their visible balance, same as if it had succeeded.

Nobody actually lost money. But on an app people trust with their money, "your balance looks wrong" is the scariest sentence you can hear.

Fixed same day.

---

## LinkedIn 1/2 — Narrative

*I fixed the bug. Then I found its shadow.*

July 6, 2026. I'd just shipped the fix for a withdrawal problem that had been haunting Safeeely for weeks — an unreadable error code was blocking people from getting their own money out.

That night, relieved, I did what I always do after a fix: I re-walked the whole flow as if I were a real user.

And I found it wasn't clean.

Withdrawing money on Safeeely sometimes means adding a new bank account first. To the person using the app, that's one action — tap, confirm, done. But behind the screen, I'd built it as two separate identity checks. Verify once to save the account. Verify again to withdraw.

My "fix" had quietly doubled the friction for a chunk of users, on the exact flow I'd just spent days trying to make painless.

I merged the two checks into one. Same evening, same sitting.

Then, going through the same corner of the code, I caught a second problem: withdrawals that failed at the payment provider — where the money never actually left the user's account — were being treated the same as successful payouts in the balance calculation. The money was always safe. But the number on screen said otherwise.

Neither of these bugs was dramatic. No outage, no lost funds, no angry support tickets yet. But both were the kind of thing that quietly erodes trust in a product built entirely on trust.

Some nights, "I shipped the fix" isn't the end of the story. It's the invitation to go look harder.

## LinkedIn 2/2 — Insight

*The bug that scares me most isn't the one that crashes your app. It's the one that lies to your users.*

Two small fixes from the same night, building Safeeely:

1. A withdrawal flow that quietly asked users to verify their identity twice for what felt like one action.
2. A balance screen that showed money as "gone" when a withdrawal had actually failed — meaning the money never left in the first place.

Neither bug broke anything. No crash, no data loss, no downtime. And that's exactly why they were dangerous.

When you're building something people trust with their money, the failure mode that matters most usually isn't "the app is broken." It's "the app told me something that wasn't true." A double verification prompt reads as "this app doesn't trust me." A balance that drops for no reason reads as "did I just lose money?"

Users don't file a bug report for that. They just quietly stop trusting you, and most of them never tell you why.

The lesson I keep relearning building Safeeely: after you ship the fix for the loud problem, go looking for the quiet one sitting right next to it. It's rarely dramatic. It's almost always the one your users actually feel.
