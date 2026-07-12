# Day 4 — A gorgeous settings page that barely saved anything

**Commit range:** `e961ab32ec539b01a8f1902b66bd32d4f83217ff` → `210575dbe1ae06e0d5ae93af07def233608f3c68`
(all June 30, 2026)

- `e961ab32` — feat(admin/settings): complete redesign matching reference — 7 section cards
- `ef90b30e` — fix(admin/settings): make all 7 setting sections actually save correctly
- `3154e673` — feat(admin): redesign analytics page to match reference design
- `210575db` — fix(admin): apply Inter Tight as base font across entire analytics page

## Delivery note

Delivered via Slack MCP to **#story-teller** — connector is attached and working this run.

---

## TikTok scripts

### TIKTOK 1/4 - Day 4: Seven Sections, One Beautiful Lie

I spent a night building the most polished page in my entire admin panel. It could barely save anything.

[pause] [look at camera]

Back on June 30th, Safeeely's settings page was a crude little 3-field form. I gutted it and rebuilt it into seven real sections — fees per currency, payouts, referral tiers, KYC rules, dispute settings, platform toggles, security. Sliders, switches, a save button per section that lit up amber the moment you changed something.

[show screen — sliders and toggles]

It looked like real software. Professional. Done.

[beat]

Except almost none of those beautiful new toggles actually saved what you clicked. And I didn't find out right away.

[lean in]

What was actually happening under the hood is the part that worries me more than any bug I've shipped.

### TIKTOK 2/4 - Day 4: The Bug That Doesn't Show Up On Screen

Flip a toggle. Hit save. Green checkmark. Nothing actually happened.

[pause]

That gorgeous new 7-section settings page I'd just built for Safeeely — the backend behind it was still only accepting about 10 of the 44 fields I'd just added to the screen. Every other switch, slider, and threshold you touched? Silently ignored. The page told you "saved" every single time. No error. No warning.

[look at camera, slightly unsettled]

And it got worse — the part of the code reading those settings back was parsing every value as a plain number. Which meant true/false toggles were quietly turning into NaN. Not a crash. Just... nothing. Numbers that used to mean something, meaning nothing.

[pause]

For a platform holding other people's money, an invisible bug beats a loud one for scariest, every time.

[soft exhale]

Here's what it actually took to make every one of those 44 fields real.

### TIKTOK 3/4 - Day 4: Two Tiny Numbers That Broke My Trust In My Own Save Button

The bug that scared me most this whole project wasn't a crash. It was a percent sign.

[pause] [show code/screen]

Fixing that settings page meant going field by field. The API's allowlist went from 10 fields to all 44. Booleans got sent as 0 or 1 instead of raw true/false, because that's what the database actually understood. And referral percentages — the screen showed "10%," but the database needed 0.10 — that conversion was just missing. Completely missing.

[shake head, half-smile]

None of that throws an error. It just quietly stores the wrong number forever, until someone notices their referral payouts look strange.

[lean in, serious]

That's the thing about settings pages — they're not exciting to build, but they're the control panel for real money moving through this platform. Get one conversion wrong and nobody yells at you. The bug just sits there, patiently, being wrong.

[pause, look at camera]

Same day, I moved on to a completely different page — and this one was more fun.

### TIKTOK 4/4 - Day 4: Turning Numbers Into A Story You Can Actually Read

Still June 30th. Same all-in-on-design mood. Different page entirely.

[pause] [show screen — charts]

Once the settings page was actually saving what it claimed to, I turned to Safeeely's analytics page and rebuilt that too. A funnel chart shaped like an actual trapezoid, with drop-off arrows so you can see exactly where people quit signing up. A revenue tab with real summary cards — total, volume, average, peak — next to a revenue-vs-volume chart. A growth tab with two area charts and a little gauge showing dispute rates at a glance. A platform breakdown showing which of the five bots — Telegram, Discord, WhatsApp, Instagram, Apple — was actually pulling its weight.

[smile]

Raw numbers in a database don't tell you anything on their own. A page like this is what turns "we have data" into "I can see what's actually happening in my own company."

[pause]

Design system, mostly finished. Next up was something a lot less visible — and a lot more dangerous.

---

## X posts

### X 1/4 - Day 4

Rebuilt Safeeely's settings page from a crude 3-field form into 7 full sections — fees, payouts, referrals, KYC, disputes, security. Looked polished and done. (June 30, 2026) Turned out almost none of it actually saved.

### X 2/4 - Day 4

The scariest bugs don't crash anything. Safeeely's new settings page only actually saved 10 of 44 fields — every toggle still showed a green "saved" checkmark. No error. Just silently ignored. Found and fixed it the same day.

### X 3/4 - Day 4

UI showed "10%," the database needed 0.10. That single missing conversion was silently corrupting referral settings in Safeeely — no crash, no warning, just a wrong number sitting there. Fixed it alongside expanding the save allowlist from 10 fields to all 44.

### X 4/4 - Day 4

Same day I fixed the settings save bug, I rebuilt Safeeely's analytics page too — real funnel chart, revenue/growth/platform tabs, a dispute gauge. Raw numbers don't tell a story. A page like this is what lets me actually see my own company.

---

## LinkedIn

Skipped — July 12, 2026 is a Sunday, not Monday.
