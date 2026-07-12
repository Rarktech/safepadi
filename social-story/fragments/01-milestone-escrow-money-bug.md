# Day 1 - The milestone escrow money bug

**Commits covered:** `b5415531` .. `27ac9d7c`
(`b54155316874f9f1de90cf83113987b177e3c399` - `27ac9d7c0315066849384b6c7f0aeb3631b9f50e`, June 25, 2026)

- `b5415531` - fix(api,telegram,discord,frontend): per-phase milestone completion + milestone-aware dispute resolution
- `27ac9d7c` - fix(whatsapp,instagram,messenger,apple_business,telegram,discord): cross-platform milestone/dispute parity

---

## TikTok 1/3 - What Safeeely actually is

*I built an app that holds your money hostage. On purpose.* [look at camera, deadpan] [pause]

So here's what Safeeely is. It's an escrow bot for deals that happen in DMs - buying a social media page, paying a freelancer, trading crypto, whatever. Instead of "trust me bro, send the money first," you and the other person open a deal through a Telegram, WhatsApp, Discord, Instagram, or Apple Messages bot. [show phone] You both get a "safetag" - basically your handle on the platform - and the money sits locked with us until you both confirm the deal actually happened.

[lean in] I built it because I watched too many people get scammed in DMs - pay first, then get ghosted.

But here's the thing nobody tells you about building the thing that holds people's money: every single bug is a money bug. [pause] And I found one early on that genuinely scared me.

## TikTok 2/3 - The bug that closed deals early

*Imagine paying a freelancer in 3 phases - and finishing phase 1 secretly closes out phases 2 and 3 too.* [pause] [show code/screen, wince]

That's the bug I found in Safeeely's milestone deals - the ones where you pay someone in stages instead of all at once. Under the hood, when someone marked ONE phase done, the system was routing it through the same logic built for simple, one-payment deals. So it finalized the WHOLE transaction. Phases that hadn't even been worked on yet, paid for yet, anything - just closed.

[look at camera] For an escrow app, that's not a small bug. That's the entire point of the product breaking.

I rewrote how phase completion worked so each stage lives on its own, gated by proof and order, nothing finalizes early. [pause] Except that wasn't even the scary part of that day.

## TikTok 3/3 - The money that belonged to no one

*The scarier bug was hiding in how disputes got resolved.* [pause, serious] [look at camera]

If a milestone deal went to a dispute, the system calculated the refund off the FULL contract value - not what was actually still sitting in escrow for that one unfinished phase. So money that was already paid out for earlier phases could get counted again. Best case, numbers just looked wrong. Worst case, money ends up credited to nobody - not the buyer, not the seller, just... stuck. [pause]

[exhale] Fixed that with a proper escrow calculator that only ever touches what's actually still held. Then I spent the rest of that same day making sure every platform - WhatsApp, Instagram, Messenger, Apple Business - had the exact same protection, not just Telegram and Discord.

[smile, soft] That was day one of really building this thing. There's a lot more where that came from.

---

## X 1/3

I built an app whose entire job is to hold your money hostage. On purpose.

Safeeely is an escrow bot for DM deals - social media page sales, freelance gigs, crypto trades. You deal through Telegram/WhatsApp/Discord/Instagram/Apple Messages, get a "safetag," and the money sits locked until both sides confirm it went through.

Built it because "pay first, then get ghosted" scams are everywhere. Started really building it back in late June. Every bug in an app like this is a money bug - and I found a bad one almost immediately.

## X 2/3

Found a bug in Safeeely's milestone deals (pay-in-phases contracts) where finishing phase 1 of 3 quietly closed out phases 2 and 3 too - because it was routed through logic meant for simple one-payment deals.

For an escrow app, that's the whole product breaking. Rebuilt phase completion so every stage stands on its own now.

## X 3/3

The scarier bug that same day: when a milestone deal went to dispute, refunds were calculated off the FULL contract value instead of what was actually still sitting in escrow. Money could end up credited to nobody.

Fixed it, then rolled the same protection out to every platform bot the same day - WhatsApp, Instagram, Messenger, Apple Business. Not just the two that already had it.

Day one of building this thing, and already a "how much money did I almost lose someone" moment.

---

## LinkedIn 1/2 - The narrative

*The first real bug I caught in Safeeely could have quietly stranded someone's money forever.*

A bit of background: Safeeely is an escrow platform for deals that happen in DMs - buying social media pages, paying freelancers, trading crypto. You transact through a bot on Telegram, WhatsApp, Discord, Instagram, or Apple Messages, under a "safetag" handle, and the money sits locked in escrow until both sides confirm the deal happened.

I built it because I kept seeing the same story: someone pays first in a DM, and the other person disappears.

Back in late June, deep in building the "milestone" deal type - where a buyer pays a freelancer in phases instead of all at once - I found something that stopped me cold.

Completing ONE phase of a multi-phase deal was quietly finalizing the ENTIRE transaction. Phases that hadn't even been paid for yet were just... closed. The bug traced back to a shortcut: phase completions were being routed through logic that was only ever meant for simple, single-payment deals.

Then, right next to it, a worse one. If a milestone deal went into a dispute, the refund math was based on the full original contract value - not on what was actually still sitting in escrow for the unresolved phase. Money already paid out for earlier phases could get double-counted. In the worst case, it wouldn't land with the buyer OR the seller. It would just sit there, credited to no one.

For an app whose entire value proposition is "we hold your money safely," that's about as close to the core mission as a bug can get.

I rebuilt phase completion so every stage finalizes independently, and wrote a dedicated escrow calculator so disputes only ever touch what's genuinely still held. Then, instead of calling it a day, I spent the rest of it making sure every platform - not just the ones I'd tested first - had the exact same protection.

That was one day, early in this build. It taught me something I've carried through every day since.

## LinkedIn 2/2 - The lesson

*In fintech, "it works" and "it's safe" are two completely different bars - and only one of them shows up in a demo.*

Early in building Safeeely, my escrow platform for DM deals (social media sales, freelance gigs, crypto trades, all run through bots on Telegram, WhatsApp, Discord, Instagram, and Apple Messages), I shipped a feature for "milestone" transactions - deals paid out in phases instead of all at once.

It looked done. You could create a deal, complete a phase, release funds. Demo-ready.

Then I found the edge case: completing phase one of three was silently finalizing the whole deal. And in disputes, refunds were being calculated against the full contract instead of what was actually still in escrow - money that could end up owed to literally no one.

Neither bug would show up if you just clicked through the happy path once. Both only appear when you deliberately try to break the sequencing, or simulate a disagreement mid-contract.

That's the lesson I keep relearning building this: for anything that touches real money, "the demo works" is table stakes, not the finish line. The bar is "what happens when someone completes things out of order," "what happens when two people disagree," "what happens when the unhappy path is the one that actually gets used."

I'd rather find these bugs myself, at 2am, before anyone's money is anywhere near them - than have a user find them for me.

If you're building anything where trust is the actual product, test the disagreement, not just the agreement.
