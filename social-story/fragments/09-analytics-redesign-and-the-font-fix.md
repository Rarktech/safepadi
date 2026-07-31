# Day 9 — Analytics redesign and the font fix

**Commit range:** `3154e6739f4019002433fc336b39843cfc504bb4^..210575dbe1ae06e0d5ae93af07def233608f3c68`
(`3154e67` feat(admin): redesign analytics page to match reference design — June 30, 2026,
`210575d` fix(admin): apply Inter Tight as base font across entire analytics page — June 30, 2026)

## TikTok scripts

### TIKTOK 1/2 — The admin dashboard that looked like a school project

I opened my own admin dashboard and cringed. [pause] This was months into building Safeeely — my AI escrow app — and the analytics page still looked like a school project. [show screen] So I rebuilt it. Not a tweak — a full redesign. A funnel chart with drop-off arrows showing exactly where people quit signing up. Revenue cards. Growth charts. A breakdown of which platform — Telegram, WhatsApp, Discord — actually made money. [lean in] One file. Almost 400 new lines of code in a single sitting. [pause] It finally looked like a real product, not a student project. [smile] But shipping it wasn't actually the hard part.

### TIKTOK 2/2 — The bug nobody would have reported

Right after I shipped that redesign, I caught myself in a mistake. [pause] I'd just spent hours making my admin analytics page look premium — new charts, new layout, the works. [show screen] Then I looked closer and realized half the numbers were in one font and half were in another. Tiny detail. Nobody using the page would've filed a bug report over it. [look at camera] But I fixed it that same day, before moving on to anything else. [pause] Because the difference between "looks fine" and "looks trustworthy" is usually five commits nobody notices. [smile] That mindset came back to bite me — and save me — a lot over the next few months.

## X posts

### X 1/2

Spent a chunk of a June evening rebuilding my own admin analytics page from scratch. Funnel charts with drop-off arrows. Revenue cards. A platform breakdown (Telegram vs WhatsApp vs Discord vs...). One file, ~400 new lines in one sitting. Building Safeeely finally started looking less like a school project.

### X 2/2

Shipped a full analytics redesign for Safeeely. Twenty minutes later I noticed half the page was in the wrong font. Nobody would've noticed but me. Fixed it same day anyway. The 1% details are the whole job when you're building something people trust with their money.

## LinkedIn posts

### LINKEDIN 1/2 — Narrative

I almost didn't touch my own analytics page.

It worked. Numbers loaded. Charts rendered. Technically, done.

But every time I opened it, something felt off. It looked like a dashboard a student would build for a class project — not something you'd trust to track real money moving through an escrow platform.

So one evening in late June, months into building Safeeely, I stopped adding features and rebuilt it from the ground up.

A funnel chart with drop-off arrows, so I could actually see where people quit mid-signup instead of guessing.
Revenue cards showing totals, averages, and peaks at a glance.
A growth view with dual area charts for users and transactions.
A platform breakdown — Telegram, WhatsApp, Discord, Instagram, Apple — so I could finally see which channel was actually driving business.

One file. Almost 400 new lines of code, in one sitting.

When I was done, it finally looked like something I'd be comfortable showing an investor, or a bank, or myself at 2am wondering if any of this was working.

That's the part nobody tells you about building solo: half the work isn't new features. It's going back and making the boring pages feel as serious as the idea behind them.

### LINKEDIN 2/2 — Insight

The bug nobody would've reported taught me more than the redesign did.

Right after I shipped a full rebuild of Safeeely's analytics page — new charts, new layout, hours of work — I noticed something small. Half the numbers on the page were rendering in one font. The other half in another.

No user would have filed a ticket about it. Nobody was going to screenshot it and complain. It's the kind of thing you could ship and nobody would ever say a word.

I fixed it the same day, before touching anything else.

Here's the lesson I keep relearning while building this alone: the difference between a product that "works" and a product people trust with their money isn't the big features. It's the hundred tiny inconsistencies you either notice or you don't.

Nobody claps for a font fix. There's no demo for "I made the numbers match." But those are exactly the commits that quietly decide whether someone trusts your product enough to send a payment through it.

If you're building something people have to trust with money, sweat the details nobody will ever mention. They're the whole point.
