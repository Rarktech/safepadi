# Day 3 - The resume command, and closing the last gap in the notification saga

**Commits covered:** `60c1d65` .. `3e2e4d3`
(`60c1d65622f1cdc414844a6133f037a4ccf1e6b8` - `3e2e4d3602ae518c6f8e08772bae27f30cfde032`, June 26, 2026)

- `60c1d65` - feat(all-bots,email): resume TXN-CODE command + notification delivery fix
- `3e2e4d3` - fix(api): return false from all sendNotification guard clauses for TS compliance

---

## TikTok 1/3 - The resume-your-deal feature

Ever start something on an app, get pulled away, and come back with zero idea where you left off? [pause] That was happening on Safeeely. Someone starts a trade, life happens, they come back hours later completely lost.

Back in June, I shipped a fix. Type "resume" plus your transaction code into ANY of my six bots - Telegram, Discord, WhatsApp, whichever - and it drops you right back into the exact next step. [show code/screen] Even the emails got a "paste this to resume" block.

[smile] Tiny feature. But once it existed, deals stopped dying from distraction.

Next up - the fix I had to make right after, just to trust it was working.

## TikTok 2/3 - The fourth layer of the silent-failure bug

[look at camera] Remember the notification bug I told you about - failed silently, three different ways? [pause] There was a fourth layer underneath it.

The function that sends your "hey, your money's ready" message was supposed to tell the app when it failed. Instead it just... didn't say anything definitive. So the app assumed success. [wince] Which meant a failed message could still get marked "delivered" - and the backup email that was supposed to catch that never fired.

I rewrote it to return an honest true or false. No more assuming. [pause]

Four separate ways one message could go quiet, on one app. That's what money demands - checking, not assuming.

## TikTok 3/3 - Build, notice, close (documentary style)

[reflective, slower pace] Zoom out with me. [pause] Four months into building Safeeely alone, and I kept noticing the same pattern in that June's bugs - notifications, role detection, phase numbers. All traced back to one root cause: code assuming something worked instead of checking.

That one day, I shipped a feature people would actually feel - resume any deal from any bot - and in that same stretch, went back to make sure the app could never again quietly lie to itself about a message getting through. [show code/screen]

That's what building this alone actually looks like. Not one clean sprint forward. A win, then closing a gap you only just noticed. [pause] Build, notice, close. That was the whole job.

---

## X 1/3

Shipped something small on Safeeely back in June that I'm still proud of: type "resume" + your transaction code into ANY of the 6 bots - Telegram, Discord, WhatsApp, whatever - and it drops you right back into your deal.

People were abandoning trades not because the app broke. Because they got lost.

## X 2/3

Told you about the WhatsApp notification bug that failed silently three different ways. Turns out there was a 4th layer.

The function sending "your money's ready" messages wasn't honestly reporting failure - so even after fixing the other bugs, a failed send could still get marked "delivered."

Made it return true/false for real this time.

## X 3/3

Four months into building an escrow app solo, and the pattern is always the same: ship the feature, then immediately go back and close the gap you just noticed underneath it.

Nobody claps for that second part. It's the only part that actually keeps people's money safe.

---

## LinkedIn 1/2 - The narrative post

Somewhere in the middle of June, I shipped a feature because I was tired of watching deals die from distraction.

Here's the problem: Safeeely is an escrow app. Someone sells a service, or a social media account, or does a crypto trade - and the money sits locked in the middle until both sides confirm it went through. Users move through that process across six different bots: Telegram, Discord, WhatsApp, Instagram, Apple Messages.

But real life doesn't pause for a transaction wizard. Someone starts a deal, gets a phone call, closes the app - and comes back four hours later with no idea what step they were on. So they'd just... give up. Not because Safeeely was broken. Because they got lost in their own deal.

The fix was almost embarrassingly simple in hindsight: type "resume" and your transaction code into any of the six bots, and it drops you exactly back where you left off. Every confirmation email got the same code baked in, so even from your inbox you could jump back in.

But shipping that feature made me confront something uglier underneath it. The function responsible for actually sending notifications - "your money's ready," "the other side just paid," all of it - wasn't honestly telling the rest of the app when a message failed to send. It just went quiet. Which meant the app could think a notification went out when it hadn't, and the backup email that was supposed to catch exactly that never fired.

So the same day I shipped something users would feel, I went back and rewrote that function to return an honest true or false. No more assuming.

Two very different kinds of work, same day. One you'd notice. One you'd never see unless it broke - and by the time it breaks, it's already cost someone real money.

## LinkedIn 2/2 - The insight post

A lesson four months into building Safeeely solo: almost every serious bug I've hit traces back to the same root cause.

Not bad logic. Not a typo. Assumption.

Code that assumes a message sent instead of checking. Code that assumes an array is sorted instead of verifying. Code that assumes a database call updated something instead of confirming it. Every one of those bugs passed its own tests. Every one of them looked done.

The scary part isn't that these bugs existed. It's that they were all silent by design - they didn't crash, they didn't log an error, they just quietly returned "success" while doing less than they claimed.

When you're building something people trust with actual money moving through it, "it didn't crash" is not the bar. "It told the truth about what happened" is the bar.

So here's my conviction, earned the hard way: ship the feature people will feel, sure. But budget just as much respect for the unglamorous pass right after it - the one where you go back and ask, "does this code actually know when it failed?" Not "does it work when everything goes right." Does it know when things go wrong.

Nobody screenshots that commit. It's still the one that matters most.
