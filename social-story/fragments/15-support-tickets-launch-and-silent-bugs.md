# Day 15 — Support ticketing launch, and the silent bugs after

**Commits covered:** `5ed2927f3dffdc95840438b840f9a8e3ae9f73af` .. `7fa4c2a881de4389e98ba866037cfa8ccad0cf1d` (July 3–4, 2026)

- `5ed2927` feat(support): add free in-house support ticket routing across all 6 bots
- `1344546` fix(support): reassign crash, attachments, notification links, ticket codes
- `7fa4c2a` fix(support): attachment-only sends, admin sidebar font, stale ticket codes

---

## TikTok scripts

### 1/4 - The build
[Hook - look at camera]
I could've just paid for a support ticketing tool. Instead I built one for free, out of parts I already had.

[pause] Back in early July, Safeeely still had a dead end in it. If you were mid-deal and something went wrong outside of an actual dispute — you typed "I need support" into Telegram, Discord, WhatsApp, whatever — and you just... got a canned message. No human. Dead end.

[lean in] So instead of bolting on some third-party CRM, I looked at what I'd already built for disputes — the live chat, the admin assignment, the notifications — and reused every piece of it for support tickets instead.

[smile] Same day, across all six bots, "I need support" started actually reaching a person.

[pause, soft] The feature part was the easy part. What happened in the next ten hours was a different story.

### 2/4 - The silent cron
[Hook - lean in, serious]
The scariest bug I found that week didn't crash anything. It just quietly stopped doing its job.

[pause] I'd built a background job that runs every ten minutes, checking for support tickets nobody had responded to, and nudging someone to go look. Standard stuff.

[show screen] Except it needed one column in the database that didn't exist yet. So every single run — every ten minutes — it just failed. No error message. No alert. Nothing in any log screaming at me.

[pause] It just... didn't do its job. Silently. For who knows how long, tickets could've been sitting there ignored and the safety net I thought I'd built simply wasn't there.

[look at camera] Found it, added the column, fixed it same day. But it taught me something I keep coming back to—

[soft, trailing] —the bugs that scare me most aren't the ones that crash. They're the ones that just go quiet.

### 3/4 - Just a photo
[Hook - hold up phone, mimic sending]
Imagine you message support with just a photo. No text, just proof of the problem. And it just... fails. No error. Nothing.

[pause] That's exactly what happened the day after I launched support tickets. Both the user side and the admin side required a message to have actual text in it — even if you were attaching a screenshot that said everything.

[show screen] So a user sends a photo with no caption, thinks it went through, and it just vanishes. Meanwhile the admin trying to reply with just an image gets hit with a "failed to send reply" error and no idea why.

[shrug, smile] Such a small assumption — "surely there's always text" — and it quietly broke a core use case on day one.

[look at camera] Fixed it, added real error messages so failures are never silent again. [pause] Small bug. Big lesson about what "done" actually means.

### 4/4 - Hot take
[Hook - direct to camera, serious]
Unpopular opinion: shipping a big feature is the easy 10%. The next ten hours are the real work.

[pause] I launched free in-house support ticketing across all six bots on Safeeely in one day. Felt great. Then spent the next ten hours finding out a silent cron bug, a crash in the admin panel, and a "just send a photo" bug I never thought to test for.

[lean in] Nobody claps for that part. There's no launch tweet for "fixed the thing I broke yesterday." But that's most of what building alone actually looks like.

[pause] If your definition of "shipped" doesn't include the fire-fighting the day after — you're not done. You just haven't found the bugs yet.

[smile, soft] Mine found me fast. Good thing I was watching.

---

## X posts

### 1/4
Safeeely used to have a dead end in it. Type "I need support" on any of the 6 bots and you got a canned message. No human.

Back in early July I fixed that — by reusing the dispute system's chat + notification pipes instead of paying for a third-party CRM. Free, and it shipped same day.

### 2/4
The scariest bug I've shipped didn't crash anything. It just quietly stopped working.

A cron job meant to nudge ignored support tickets every 10 min needed a database column that didn't exist. So it failed. Silently. Every 10 minutes. No alert, no error — nothing to notice.

### 3/4
Shipped support tickets. Next day: a user sends *just a photo* to support, no caption. It vanishes. No error on their end. Admin tries to reply with just an image — gets "failed to send reply."

Turns out both sides assumed there'd always be text. Small assumption, real break.

### 4/4
Hot take: shipping the feature is the easy part. The 10 hours after — finding the silent cron failure, the crash, the "just a photo" bug — that's the actual work.

Nobody posts about fixing what they broke yesterday. But that's most of building alone.

---

## LinkedIn posts

### 1/2 - Narrative
*I gave Safeeely users a way to reach a real human. Then spent the next 10 hours finding out what I'd broken.*

Early July. Safeeely — the escrow platform I've been building solo alongside med school — had a dead end in it.

If something went wrong mid-deal that wasn't a full dispute, users typed "I need support" into Telegram, Discord, WhatsApp, wherever they were. And got a canned auto-reply. No human. Nowhere to go.

I could have paid for a third-party support/CRM tool to fix that. Instead I looked at what I'd already built for handling disputes — live chat, admin assignment, notifications — and reused every piece of it for support tickets instead.

Same day, across all six bots, "I need support" started actually reaching a person.

It felt like a real win. It was also the easy part.

Over the next ten hours, real users started hitting the new feature — and it started hitting back:

→ A background job meant to nudge ignored tickets every 10 minutes was silently failing on every single run, because of one missing database column.

→ The admin "reassign" panel was crashing outright.

→ Users sending *just a photo* with no text message found their message vanished with zero error.

None of these showed up in testing. All of them showed up the moment real people used the thing for real problems.

I fixed all three within the day. But the lesson stuck longer than the bugs did.

### 2/2 - Insight
The bugs that scare me most aren't the ones that crash loudly. They're the ones that fail silently.

Building Safeeely's support ticketing system taught me that the hard way.

I'd built a background job to check every 10 minutes for support tickets nobody had responded to, and nudge someone to look. Good idea. Except it depended on a database column that didn't exist yet — so every single run just failed. No error thrown. No alert fired. Nothing in any log flagging it.

The safety net I thought I'd built simply... wasn't catching anything. And I had no way of knowing, because nothing was telling me it was broken.

Here's the conviction I've landed on after too many bugs like this one: a loud failure is a gift. It stops you, it screams, you fix it in minutes.

A silent failure just erodes trust in the background while you think everything's fine. Those are the ones that cost you — in ignored tickets, in missed refunds, in a user quietly concluding your product doesn't work and never telling you why.

If you're building solo, you don't get a QA team to catch these for you. So the standard I try to hold myself to now: if something can fail, it has to fail loud. Every time.
