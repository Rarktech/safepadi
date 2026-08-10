# Day 19 — The real fix: emailed OTP replaces the bot redirect

**Commit range:** `426667b9214a066638fd587562bf2f09dca87d6f` (July 6, 2026)
`feat(withdraw): auto-elevate via emailed OTP instead of bot-only step-up`

---

## TikTok Scripts

### 1/3 — The fix that closes yesterday's story

[lean in] Okay so remember that ugly error message I fixed yesterday — "confirm from your bot"? [pause] I sat with it for a day and realized... I fixed the wording. I didn't fix the problem. [show screen] Users still had to stop what they were doing, leave the website, open Telegram or WhatsApp, dig for a menu button, just to prove it was really them before they could withdraw their money. [pause] So today I ripped that whole flow out. Now you just get a 6-digit code straight to your email, type it in right there on the withdraw screen, done. [smile] Same security. Zero detour. [look at camera] Turns out the real fix is never the one you ship first.

### 2/3 — The platform constraint reveal

[pause] Here's something people don't realize about building bots on WhatsApp or Instagram. [show screen] Meta gives you a 24-hour window to message a user after they message you — after that, silence, unless they message first. [lean in] So if someone tried to withdraw money three days after they last opened the bot, I genuinely could not reliably send them a confirmation message. Not a bug. A platform rule. [pause] That's the real reason withdrawals kept breaking for some users and not others. [smile] The fix wasn't in my code at all — it was picking a channel none of these platforms could block me from: email. [look at camera] Sometimes the bug isn't the bug.

### 3/3 — Documentary style: the third pass

[pause, slower pace] Early July was rough. Day one, a scary raw error code leaking straight to users. Day two, I patched the wording so at least it read like a human wrote it. [pause] But patching wording is what you do when you're tired and just need it to stop hurting — not when you've actually solved anything. [lean in] It took stepping back and asking "why does this flow exist at all" before I saw it: the entire redirect-to-your-bot step was a workaround for platforms that couldn't always reach the user. [show screen] Once I saw that, the fix was obvious — email everyone the same way, always. [look at camera] Four months into this build and I'm still learning: the annoying bug you keep half-fixing is usually pointing at a design decision, not a typo.

---

## X Posts

### 1/3

Yesterday I shipped a nicer error message for a withdrawal bug. Today I realized the error message was never the problem — the whole flow was.

Ripped out the "go confirm on your bot" redirect and replaced it with a 6-digit email code that finishes the withdrawal right there.

Same security. Zero detour.

### 2/3

TIL (the hard way, building Safeeely) — WhatsApp and Instagram only give you a 24-hour window to message someone after they message you. After that: silence, unless they message first.

That single platform rule was quietly breaking withdrawal confirmations for anyone who came back a few days later. Not a bug in my code. A rule I didn't control.

Fixed it by moving confirmation to email — the one channel that works the same for every user, every platform, every time.

### 3/3

Spent early July fixing the same withdrawal bug three separate times. First: the leak. Then: the wording. Finally: the actual design.

Lesson four months into building Safeeely — if you keep patching the same spot, you're not fixing a bug anymore. You're avoiding a redesign.

---

## LinkedIn Posts

### 1/2 — Narrative

I fixed the same withdrawal bug three times in four days.

Here's what that actually looked like from the inside.

First, I found a raw error code — "STEP_UP_REQUIRED" — showing up directly on the dashboard for users trying to withdraw money. No explanation. Just a code a developer would understand and nobody else would.

I patched it fast: swapped the code for a plain-language message telling people to go confirm from the bot they registered with.

That felt like a fix. It wasn't.

The next day, sitting with it, I realized I'd only fixed the sentence. The actual experience was still: stop what you're doing, leave the website, dig around in Telegram or WhatsApp for the right menu, come back, hope it worked.

So I went back in and asked a harder question — why does this redirect exist at all?

The answer: WhatsApp, Instagram, and Messenger only let a bot message a user for 24 hours after that user last messaged it. After that window closes, the bot goes silent unless the user speaks first. So the redirect wasn't a UX choice. It was a workaround for a platform limit I don't control — and it was quietly failing for anyone who came back to withdraw a few days after they'd last opened the bot.

Once I saw the real constraint, the fix was obvious. Withdrawals now email a 6-digit code straight to the user, right there on the same screen, and the session auto-elevates and finishes the withdrawal the moment it's verified. Same security guarantee. No detour. No platform-dependent failure mode.

Building Safeeely solo, four months in, the lesson that keeps repeating: if you're patching the same spot more than once, stop patching. Ask why it's there.

### 2/2 — Insight/take

Most "quick fixes" aren't fixes. They're a nicer coat of paint on the actual problem.

I learned this again this week building Safeeely.

A withdrawal error was showing users a raw internal error code. I patched it in under an hour — same broken flow, just friendlier words on top.

It felt productive. It shipped. It even closed the ticket in my head.

But the underlying flow — redirecting a user off the website, into a messaging bot, to dig for a confirm button — was still there. And for a meaningful slice of users, on WhatsApp and Instagram specifically, it was silently failing, because those platforms only allow a bot to message someone within a 24-hour window of that person's last message.

The wording fix didn't touch that. It couldn't. The bug wasn't in the sentence — it was in the architecture.

My rule now, as a solo founder building something people trust with real money: when the same complaint or bug resurfaces after you've "fixed" it, don't reach for another patch. Ask what design decision is actually generating it.

The redesign — replacing the bot redirect with a same-screen emailed code — took a few more hours than the wording patch did. It also made the underlying failure mode structurally impossible instead of just less visible.

Fast fixes buy you time. They don't buy you correctness. Know which one you're actually doing.
