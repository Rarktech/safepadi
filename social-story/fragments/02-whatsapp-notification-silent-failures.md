# Day 2 - The bug where the app went silent

**Commits covered:** `0627196` .. `7fdbbfe`
(`0627196091a532df2f4a9b5da8a3f4aa89e522a4` - `7fdbbfe976091bed02df029340a1de1f4062f609`, June 26, 2026)

- `0627196` - fix(notifications): bypass 24h messaging window for transactional notifications
- `cbc754a` - fix(whatsapp,api): normalize phone_id format to prevent platform-activity mismatches
- `7fdbbfe` - fix(profiles): correct Supabase update count syntax in platform-activity endpoint

---

## TikTok 1/3 - The bug where the app went silent

One day back in June, WhatsApp buyers on Safeeely stopped getting told "hey, you got paid, go finish the deal." [pause] No error. No crash. Just... silence.

Quick reminder - Safeeely's an escrow bot, money sits locked until both sides confirm a deal happened. So when the notification that tells you "your money's ready to release" just doesn't show up, that's not a cosmetic bug. That's someone's money going quiet.

[lean in] My first guess was WhatsApp itself. Meta has a rule - businesses can't message you unless you've messaged them in the last 24 hours. Made sense. So I built a bypass for anything transactional - payments, disputes, proof uploads - real deal updates, not spam. [show code/screen]

Shipped it. Felt good. [pause, look at camera]

It didn't fix it for everyone.

## TikTok 2/3 - The fix that didn't fix it

I shipped the "fix." It still didn't fix it for some people. [pause] That's the worst feeling in debugging - watching something you were SURE was the answer, just... not be the answer.

So I went digging. [show code/screen] Turned out Safeeely had two different places that saved your WhatsApp number - one when you registered through a WhatsApp Flow, one from the actual message webhook. One saved it with a "+" in front. The other didn't.

To the system, those looked like two different numbers. So every time it checked "has this person messaged us recently," it silently failed to match - and treated real, active users as if they'd gone dark forever. [wince]

One missing plus sign, and it looked like half my buyers had ghosted the app.

Fixed the mismatch. Buyers started showing up again. [smile, pause]

But there was still one more layer under this bug I hadn't found yet.

## TikTok 3/3 - The silent failure nobody sees (hot take)

Hot take: the scariest bugs aren't the ones that crash your app. [look at camera] They're the ones that report SUCCESS while doing absolutely nothing.

That's what I found chasing this same WhatsApp notification bug. The code that updates "last time this person messaged us" was asking the database the wrong question. It was basically asking "if I searched for rows matching this person, how many would show up" - instead of "how many rows did I actually just update." [pause] Two almost-identical database calls. One tells you what exists. One tells you what changed.

So the code kept running, kept saying "done," and kept touching zero rows. No error, no warning, nothing in the logs to chase.

[lean in] Three separate bugs, one afternoon, and every single one of them was silent by default. That's the part that should scare anyone building something people trust with their money - the failures that don't announce themselves are the ones that cost you.

Next time - the story moves into a much bigger stretch of the build.

---

## X 1/4

Back in June, WhatsApp buyers on Safeeely stopped getting told "your payment's ready to release."

No crash. No error. Just silence.

For an escrow app, a notification that quietly doesn't send isn't a UI bug. It's someone's money going dark.

Spent the day chasing it.

## X 2/4

Found it (I thought): WhatsApp blocks businesses from messaging you unless you messaged them in the last 24 hours.

Built a bypass for real transactional stuff - payments, disputes, proof uploads.

Shipped it.

Still broken for some buyers. Turns out that wasn't the whole bug.

## X 3/4

Real bug, layer 2: Safeeely saved your WhatsApp number two different ways in two different places - one with a "+", one without.

To the system those were different people. So it thought real, active buyers had never messaged, ever.

One missing plus sign made half my users look like ghosts.

## X 4/4

Layer 3, and the one that actually scared me: the code was asking the database "how many rows exist" instead of "how many rows did I just change."

So it kept reporting success while updating literally nothing. No error anywhere.

The bugs that scare me most now aren't the ones that crash. They're the ones that lie and say "done."

---

## LinkedIn 1/2 - The narrative

A notification that never sends is scarier than a crash.

Back in June, I noticed something wrong with Safeeely, the escrow bot I've been building for social media trades, freelance gigs, and crypto deals: some WhatsApp buyers weren't getting told their payment was ready to release.

No error message. No crash log. The app just... went quiet for them.

For most products, a missed push notification is annoying. For an escrow product - one that exists specifically to hold people's money safely between two strangers - a notification that silently fails to send is a trust failure. Someone's money was sitting there, done and ready, and they had no idea.

My first theory was WhatsApp's own policy: Meta blocks businesses from messaging users who haven't messaged them back within 24 hours. Reasonable guess. I built a bypass for anything transactional - payment confirmations, dispute updates, proof-of-delivery uploads - while keeping the restriction for anything promotional.

I shipped it, relieved.

It didn't fully fix it.

So I kept digging, and found the real problem was hiding one layer deeper: Safeeely was saving a user's WhatsApp number two different ways depending on how they signed up. One path kept the "+" in front of the number. The other stripped it. To the database, those were two different people. Every time the system tried to check "has this user messaged us recently," it silently failed to match - and treated real, currently-active buyers as if they'd vanished months ago.

One missing character, quietly making a chunk of my user base look inactive forever.

I fixed the mismatch. Then found a third bug underneath that one - a database call that was checking the wrong thing entirely, reporting success while changing nothing.

Three bugs. One afternoon. All of them silent by default.

That's the part of building something people trust with money that nobody warns you about: the failures you have to worry about most are the ones that don't announce themselves.

## LinkedIn 2/2 - The insight

The bugs that should scare you most are the ones that report success.

Here's a pattern I keep running into while building Safeeely: a crash is a gift. It's loud, it points at a line of code, and it forces you to fix it immediately.

A silent failure is the opposite. It passes every casual check. The function returns. No exception. The logs look clean. Everything LOOKS like it worked.

I spent an afternoon in June chasing exactly this. WhatsApp buyers on Safeeely weren't getting notified their payment was ready to release. Three separate bugs were stacked on top of each other, and every single one of them failed silently:

1. A messaging-policy check that quietly blocked time-sensitive notifications, same as if they were spam.
2. A phone number stored two different ways in two different code paths - so the system silently mismatched real users with their own accounts.
3. A database update that was silently checking the wrong thing, reporting "success" while touching zero rows.

None of these threw an error. None of them showed up as a red flag anywhere. I only found them because a user told me something felt off, and I refused to accept "it should be working" as an answer.

The lesson I keep relearning: when you're building something people trust with their money, "no errors" is not the same as "working." The failure modes that matter most are the ones designed - by nature of the system, not by anyone's intent - to look exactly like success.

If you're building anything where trust is the actual product, don't just ask "did it crash." Ask "how would I know if this silently did nothing at all."
