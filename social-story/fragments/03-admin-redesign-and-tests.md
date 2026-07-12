# Day 3 — The admin panel gets a real face (and a test suite nobody asked for)

**Commit range:** `559973d5829a757ddeae697977736c7c5fe085cd` → `292f1b16ffdd8bb1dbb501258c5de2da907a768f`
(both June 30, 2026)

- `559973d5` — feat(admin): complete admin panel redesign, test suite, and login fix
- `292f1b16` — feat(admin): redesign all 8 admin pages to match reference design

## Delivery note

Both Slack and Telegram delivery failed on this run — the sandbox's outbound network
policy returned `403 Forbidden` on the CONNECT tunnel to both `hooks.slack.com` and
`api.telegram.org` (confirmed via `$HTTPS_PROXY/__agentproxy/status`, which logged
`connect_rejected` / "policy denial" for both hosts). All 8 messages below were
delivered as Gmail drafts to peterrichard013@gmail.com instead, per the fallback rule.

---

## TikTok scripts

### TIKTOK 1/4 - Day 3: The Admin Panel Was Ugly On Purpose

The tool I use to actually run my own company — I built it ugly. On purpose.

[pause] [look at camera]

Back at the end of June, I'd just pulled an all-nighter building Safeeely's entire admin dashboard from scratch — disputes, support, fraud, analytics, ten new pages in one sitting.

[show screen — dark clashing colors]

It worked. Every button, every page, every workflow. But visually? It looked like five different dark modes fighting each other. Mismatched fonts, colors that didn't match anything.

[shrug, smile]

And I shipped it like that. On purpose. Because at 4am, "does it work" beats "does it look nice" every single time.

[lean in]

A few days later I finally sat down to fix how it looked. What I did to it next actually surprised me.

### TIKTOK 2/4 - Day 3: Giving The Whole Panel One Real Face

Twenty-six pages. One design system. One sitting.

[pause] [show before/after mockup gesture]

Once the admin panel was working, I went back in — end of June — and gave it a real look. One navy color palette across every single page instead of whatever I'd slapped on at 4am.

[show code/screen]

The dispute detail page got the biggest glow-up — I rebuilt it into a proper three-column layout: chat on one side, case details in the middle, resolution actions on the right. Same logic underneath, completely different feel.

[smile, nod]

Consistent headers, consistent fonts, consistent everything. It finally looked like software you'd trust with people's money — because that's exactly what it is.

[pause]

But the redesign wasn't even the most important thing I shipped that day. That one's next.

### TIKTOK 3/4 - Day 3: Hot Take — Ship It Ugly First

Hot take: if you're waiting for it to look good before you ship it, you're never shipping it.

[pause] [direct to camera]

I built Safeeely's entire admin dashboard — the tool I use every day to manage real disputes and real money — and I shipped it genuinely ugly. Clashing colors. No consistent fonts. I knew it looked bad.

[shrug]

I shipped it anyway. Because "does it work" and "does it look nice" are two completely different problems, and solving them at the same time is how side projects die in draft folders.

[lean in, more intense]

I fixed the look a few days later, in one sitting, once I actually knew the thing worked end to end. Function first. Face second. Every time.

[pause, half-smile]

Fight me in the comments if you disagree — I've got receipts either way.

### TIKTOK 4/4 - Day 3: The Part Nobody Asks About In A Demo

Nobody has ever asked to see my test suite. I wrote one anyway.

[pause] [show terminal running tests]

While I was redesigning the admin panel that same day at the end of June, I also quietly did something I'd never done before on this project — I wrote real automated tests. Sixty-six of them. Covering admin login and every core admin route.

[look at camera]

No investor asks about it. No one filming a demo cares. It doesn't show up in a screen recording at all.

[pause]

But it's the difference between "I think this still works" and "I know this still works" every time I touch this codebase again. And for a platform holding other people's money — that's not optional, that's the job.

[soft smile]

The boring stuff is usually the stuff that actually saves you. More of what almost broke — coming up.

---

## X posts

### X 1/4 - Day 3

Built Safeeely's entire admin dashboard in one overnight sitting. It worked. It also looked like five dark modes fighting each other. Function beat pretty for about 4 days — on purpose.

### X 2/4 - Day 3

Went back and gave all 26 admin pages one real design system — navy tokens, consistent fonts, a proper 3-column dispute view. Same logic underneath, finally looked like software you'd trust with your money.

### X 3/4 - Day 3

Hot take: ship it ugly first. I built Safeeely's whole admin panel functional-but-hideous, fixed the look days later once I knew it worked. Wait for pretty and it never ships.

### X 4/4 - Day 3

While redesigning the admin panel, I quietly wrote my first real test suite for Safeeely — 66 tests on auth and admin routes. No one asks to see that in a demo. It's why I sleep at night.

---

## LinkedIn

Skipped — July 12, 2026 is a Sunday, not Monday.
