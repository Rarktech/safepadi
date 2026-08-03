# Day 12 - The memory leak hunt

**Commit range:** `03e1c458471e2338ad77c2d2ca486a6a87c90a93..05a0ffd5c022455e2d37c950dfcb63b65873e606`
(single commit: `05a0ffd5` — "fix(api): resolve memory leaks causing sustained RSS spikes", June 30, 2026)

## TikTok scripts

### 1/3 - The server that kept getting fatter
My server was quietly getting fatter every single day. [pause] Not because of bugs in my escrow logic — no missing money, no wrong balances. It was memory. Every time Safeeely generated something — a PDF receipt, a referral card image — a tiny invisible browser opened inside my server to draw it, take a screenshot, and close. [pause] Except it wasn't really closing. The memory it used just... stayed. Day after day the number kept climbing until the whole server crashed and restarted itself, sometimes mid-transaction. [lean in] I finally sat down to hunt it down. Turns out it wasn't one leak. [pause] It was five, stacked on top of each other. [smile]

### 2/3 - The ghost process
Here's the creepiest bug I've found on Safeeely so far. [pause] When that invisible browser inside my server crashed or lost its connection, I'd just... open a new one. Simple, right? [pause] Except the old one never actually died. It kept running in the background, like a ghost process, quietly eating memory forever, completely invisible to me. [show code/screen] Multiply that by weeks of small crashes nobody noticed, and you get a server that mysteriously runs out of memory for no visible reason at all. [pause] The fix was one extra line — force the old ghost to shut down before starting a new one. [look at camera] One line. Weeks of mystery.

### 3/3 - Hot take on silent bugs
Unpopular opinion about building alone as a solo founder: [pause] the bugs that actually hurt you are never the ones you can see. [pause] A wrong balance, a broken button — those scream at you immediately, users report them the same day. But a memory leak? It whispers. It creeps up over days and weeks until your server just falls over at the worst possible time, usually while someone's money is mid-transaction. [lean in] If you're building something people trust with real money, you can't only fix what's loud. You have to go looking for what's quiet. [pause] That's the harder, less glamorous work — and honestly, it's the work that actually keeps trust intact. [smile]

## X posts

### 1/4
My escrow app's memory kept quietly climbing every day until the whole server crashed. No missing money, no broken logic — just memory that never came back down. Spent a day hunting it down. It wasn't 1 leak. It was 5, stacked on top of each other.

### 2/4
Turns out every PDF receipt and referral image on Safeeely is drawn by an invisible mini browser running inside my server. Cool trick — until it stops properly closing and just... stays in memory forever. That was leak #1 of 5.

### 3/4
Creepiest bug I've shipped a fix for: when that invisible browser crashed, I'd just open a new one — but the old one never actually died. A ghost process, quietly eating memory in the background. One extra line of code finally killed it for good.

### 4/4
Lesson from this week building Safeeely: the bugs that don't show up in a bug report are the ones that eventually take your whole system down. Silent memory creep doesn't get an angry DM from a user — it gets a server restart at 2am with nobody watching.

## LinkedIn posts

### 1/2 - The narrative
My server started getting slower for no reason I could see.

No error messages. No missing money. No wrong balances. Just... a server that would randomly restart itself every few days, sometimes right in the middle of a transaction.

For a platform holding other people's money in escrow, that's not a cosmetic bug. That's the kind of thing that quietly erodes trust — a payment that seems to stall, a user who refreshes twice before it goes through, and never tells me why they hesitated to use it again.

So back at the end of June, I stopped adding features and went hunting.

The trail led to something I didn't expect: every time Safeeely generates a PDF receipt or a referral card image, it spins up a tiny invisible web browser inside the server to draw it, screenshot it, and close it down. It's a neat trick. It's also, it turns out, a great way to leak memory if you're not extremely careful.

I found five separate leaks stacked on top of each other:

→ A browser flag that quietly stopped memory from ever being released back to the system, even after cleanup.

→ No limit on how many of these invisible browsers could open at once, so a burst of requests could spike memory by hundreds of megabytes in seconds.

→ A "ghost process" bug — when a browser crashed, I'd open a replacement without ever properly killing the old one, so it kept running in the background forever.

→ No cleanup step when the server restarted for a routine deploy, so Chrome processes were left orphaned.

→ A second, redundant database connection pool running the entire time, for no reason.

None of these were dramatic on their own. Together, they were why my server kept quietly running out of memory.

Fixed all five the same day. Memory now actually returns to baseline when things go idle — the way it always should have.

### 2/2 - The insight
The most dangerous bugs never make it into a bug report.

A wrong number on a screen, a button that doesn't work — users find those in minutes and tell you immediately. They're annoying, but they're easy. They scream.

A memory leak doesn't scream. It whispers. It takes days or weeks to become visible, and by the time it is, it doesn't look like a bug — it looks like "the server is just being weird today." Nobody files a ticket for that. It just quietly gets worse until something falls over, usually at the worst possible moment.

This week on Safeeely, that's exactly what happened. Five separate memory leaks, none of them individually dramatic, had been stacking up in the background for a while — one of them from a feature I built weeks earlier. No user ever complained about a specific one. They just experienced an app that occasionally felt a little less reliable than it should have.

Here's the lesson I keep relearning as a solo founder building something people trust with real money: the loud bugs are not the ones that will actually hurt you. You'll always fix those — they demand it. It's the quiet ones that need you to go looking for them on purpose, before anyone else even notices they're there.

If you're building anything people depend on, reliability isn't a feature you ship once. It's a discipline you keep practicing, especially when nothing looks broken.
