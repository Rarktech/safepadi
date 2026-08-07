# Day 16 — Feedback digest, and the bug I'd already fixed once

**Commits covered:** `b4ac1f666992d60ca3816d6e3c524dbf072b18ed` → `f53b479f299fc4c0cdd0cdfd20afaa5699c9a921` (July 5, 2026)

- `feat(api): add scheduled feedback-digest endpoints (email + Telegram)`
- `fix(api): bound feedback-digest query and disable Sharp's native cache`

---

## TikTok 1/3 — I built an AI that watches my own app so I don't have to

[pause] So back in July, about two weeks into building Safeeely full-time, I built something a little different.

[show phone] Every day, people leave feedback inside the bots — Telegram, WhatsApp, all of them. And I genuinely did not have time to read all of it between med school and everything else.

[lean in] So I built a small reporting tool. It scans the new feedback, an AI summarizes what's actually going on, and it DMs me a report — on Telegram, and by email.

[pause] But here's the part I actually want you to remember: I didn't give this tool my full admin key. I gave it a narrow one. It can only read feedback. Nothing else.

[smile] Even your own automation shouldn't get more power than it needs.

[look at camera] That one decision mattered more than I realized... just 45 minutes later.

## TikTok 2/3 — I fixed the same bug twice

[pause] 45 minutes after I shipped a new feature I was proud of, I found a bug I had ALREADY fixed. Before. In a different part of the app.

[show code] The tool I'd just built to summarize user feedback was pulling from the database with no limit. Meaning if it ever ran on a big batch, it would try to grab the ENTIRE table in one shot.

[pause] I'd hit this exact pattern before. Weeks earlier. Different file, same mistake.

[lean in] And that's when it actually clicked for me — fixing a bug once doesn't mean you've learned it. You've just patched one spot. The pattern is still loose in your head somewhere, waiting to sneak back in.

[look at camera] So I capped it. 500 rows at a time, every time.

[smile] Lesson relearned. Again.

## TikTok 3/3 — The real pattern behind four months of building this alone (documentary)

[pause] Four months into building Safeeely solo, and I noticed the pattern repeats almost every single week.

[show screen] Ship something. Feel genuinely good about it for an hour. Then find what you missed.

[pause] That week, it was a little feedback report I built so I could actually hear what users were saying, without personally reading every single message across five bots.

[lean in] And within that same hour — a database query with no limit on it, and a 50-megabyte memory cache I didn't even know I'd left switched on.

[look at camera] Building alone means there's no senior engineer checking your PR. No one catches these but you.

[smile] Whether you go back and actually check your own work — that's basically been the whole story so far.

---

## X 1/3

Built a feature where an AI reads user feedback on Safeeely and DMs me a plain-English summary, so I don't have to read every message myself between med school classes.

Gave it a key that can ONLY read feedback — not my admin password.

Least privilege. Even for your own bots.

## X 2/3

45 minutes after shipping that feature, I found a bug I had ALREADY fixed once before — in a different file. A database query with no cap on how much it could pull at once.

Same mistake, new location.

Building solo means nobody catches these but you.

## X 3/3 (hot take)

Hot take: fixing a bug once teaches you almost nothing if you don't turn it into a rule.

I've now hit the same "unlimited database query" bug twice in this codebase, weeks apart.

The lesson was never the fix. It's building a habit so you stop needing the fix.

---

## LinkedIn 1/2 — Narrative

One Sunday evening in July, I shipped a feature I was genuinely proud of.

Forty-five minutes later, I found a bug I thought I'd already killed.

I'd just built a small reporting tool for Safeeely — every day, users leave feedback inside our Telegram, WhatsApp, Discord, and Instagram bots. I didn't have time to read all of it between building the platform and keeping up with med school. So I built something that could read it for me: it pulls in new feedback, an AI summarizes what's actually going on, and sends me the digest by email and Telegram.

I was careful about one thing while building it: I didn't give this automated tool my full admin credentials. I gave it a narrow, single-purpose key — it can read feedback, and nothing else. If that key ever leaked, the damage is capped at "someone can read feedback," not "someone can touch the whole platform."

Then, less than an hour after shipping it, I went back through the code and found the query had no limit on how much data it could pull. If it ever ran without a proper cursor, it would try to fetch the entire feedback table in one request.

Here's the uncomfortable part: I had fixed this exact class of bug before. Weeks earlier. In a completely different file.

Same mistake. New location.

Building this alone means there's no one reviewing my pull requests, no senior engineer flagging the obvious thing before it ships. Just me, a few hours later, hoping I go back and actually check my own work.

That night I did. I capped the query at 500 rows at a time, and while I was in there, I noticed an image-processing library was quietly holding onto a 50MB memory cache it didn't need — so I turned that off too.

Small fixes. But they're the ones that keep a solo-built platform standing.

## LinkedIn 2/2 — Insight

Fixing a bug once teaches you almost nothing.

That's not a typo. Let me explain.

While building Safeeely, I've now hit the exact same category of bug twice — weeks apart, in two different files. Both times: a database query with no limit on how much data it could pull back. Both times, if the wrong conditions lined up, it would try to drag an entire table into memory in one shot.

The first time I fixed it, I felt smart. Patched the file, moved on, mentally filed it under "solved."

Then I built a completely unrelated feature — an automated feedback digest — and wrote the exact same bug into brand new code, without even noticing.

Here's the lesson I actually took from it: fixing a bug once doesn't install the lesson in your head. It just closes one door. The pattern that let the bug in is still sitting there, ready to walk through the next door you build.

The fix isn't "be more careful." Careful doesn't scale, especially solo. The fix is building a habit — a checklist, a rule you apply automatically, a five-minute self-review pass on every new endpoint before you call it done.

There's a related principle I leaned on the same day: whenever I build something that acts on my behalf — even a small internal tool — I give it only the narrow access it actually needs, never a full master key, "just in case." Scope down by default. It costs a few extra minutes. It caps the damage of everything you didn't think of.

Neither of these are exciting lessons. Nobody puts "I capped a query and scoped a token" on a highlight reel.

But four months into building this alone, it's exactly this kind of unglamorous discipline that's kept the whole thing standing.
