# Day 17 - The withdraw error nobody could read

**Commit range:** `0b3f411eba8bb8719ea0f288b9684aeebfecf016` (July 5, 2026)

`fix(frontend): explain STEP_UP_REQUIRED instead of showing raw error on withdraw`

---

## TikTok 1/2 - narrative

[Lean in, half-smile] Picture this. Someone's trying to pull their own money out of Safeeely. They hit withdraw... and the app throws this at them: "STEP_UP_REQUIRED." [pause] That's it. No explanation. Just a locked door with no sign on it.

Here's why it happened. If you signed up through a bot — Telegram, Discord, whatever — sometimes I need a fresh "yep, it's really you" confirmation from that same bot before you touch your money. Good idea. [pause] Except when someone was only using the website, the app just... dumped that raw internal error code straight at them. Like handing someone a stack trace and walking away.

[look at camera] I found it, and swapped it for an actual dialog: "hey, go confirm this from your bot." Same protection. Human words. [smile] Small fix. But it's not the last error message I had to go back and fix...

## TikTok 2/2 - hot take

[straight to camera] Unpopular opinion: if your app's error message is literally a variable name from your code, you didn't ship a feature. You shipped a bug with extra steps. [pause]

I found "STEP_UP_REQUIRED" sitting in a toast notification on Safeeely — the exact string from my backend, no translation, no context — right in front of someone trying to withdraw actual money. [pause] That's not a UI nitpick. When money's involved, confusion isn't annoying, it's scary. People assume the worst.

[lean in] The fix took maybe twenty minutes. The bug survived because nobody looked at it from the user's seat. [pause] That's the real lesson — the gap between "it technically works" and "a normal person understands what's happening" is where trust gets built or lost...

## X 1/2 - narrative

A Safeeely user tried to withdraw their own money and got told: "STEP_UP_REQUIRED."

No explanation. Just an error code staring back at them like a locked door with no sign.

July 5: I found it and replaced it with an actual sentence telling them exactly what to do. Same security. Zero confusion.

## X 2/2 - hot take

Hot take: if your app's error message is a variable name copy-pasted from your backend, you didn't build a product — you exposed your code to a stranger.

Found one of these on Safeeely's withdraw flow, sitting in front of people trying to move their own money. Fixed it in 20 minutes. It survived way longer than that.

## LinkedIn 1/2 - narrative

**The scariest error message isn't the one that crashes your app.**

It's the one that makes a user feel like something went wrong with their money — and doesn't tell them what.

Back on July 5, I was going through Safeeely's withdraw flow and found this: a user tries to pull money out, and if they're on the web dashboard without a fresh confirmation from their linked bot (Telegram, Discord, WhatsApp — wherever they registered), the app throws up a toast that just says:

"STEP_UP_REQUIRED."

That's it. That's the whole message. A raw string straight out of my backend code, dumped in front of someone trying to access their own funds.

Think about what that actually feels like on the other end. You're trying to get your money. The app spits out gibberish. Your first thought isn't "ah, a state variable" — it's "did something break? Is my money stuck? Did I get scammed?"

The security logic behind it was fine — Safeeely genuinely does need that extra confirmation for certain withdrawals, so a stolen web session alone can't move funds. The problem was never the rule. It was that I'd never translated it into something a human being could read.

I rewrote it as a plain dialog: here's what's happening, here's the one thing to do about it — go confirm from the platform you signed up with.

Same protection. Zero confusion.

It was a small fix. But it's a reminder I keep re-learning building this alone: the backend can be airtight and the product can still fail someone, right at the moment it matters most — because nobody sat in their seat and read what they were about to see.

## LinkedIn 2/2 - insight/take

Here's a lesson from building Safeeely solo that I wish someone had told me on day one:

**Your error messages are part of your product. Not an afterthought. Not a debugging detail. Product.**

I found this out the hard way going through the withdraw flow. A user without a fresh bot confirmation would hit a wall that said, verbatim, "STEP_UP_REQUIRED" — an internal code, shipped straight to a real person, with real money on the line.

Nobody wrote that message to be cruel. It's just what happens by default. You build the logic, you name the condition something sensible for your own code, and if you don't circle back, that condition name becomes the last thing your user sees before they panic.

In a normal app, that's a bad experience. In a fintech / escrow product — where the whole pitch is "trust us with your money" — it's worse than a bad experience. It's a trust leak. Every unexplained error is a tiny vote for "maybe this platform doesn't actually have it together."

The fix isn't complicated. It's not even hard, technically. It's the twenty minutes of asking: if I had zero context on how this system works, what would I need to hear right now?

I think about error copy as a design decision now, not a leftover. If a message can only be understood by the person who wrote the code, it's not a message. It's a note to yourself that accidentally went live.
