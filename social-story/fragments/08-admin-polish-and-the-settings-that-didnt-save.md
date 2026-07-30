# Day 8 — Admin polish, and the settings page that didn't save

**Commit range:** `292f1b16ffdd8bb1dbb501258c5de2da907a768f..ef90b30e56ec8f35843972a972b5db6e78e18ffd` (June 30, 2026)

Commits covered:
- `292f1b1` feat(admin): redesign all 8 admin pages to match reference design
- `e961ab3` feat(admin/settings): complete redesign matching reference — 7 section cards
- `ef90b30` fix(admin/settings): make all 7 setting sections actually save correctly

---

## TikTok scripts

### TikTok 1/3 — The redesign that hid a lie

*I redesigned my entire admin dashboard in one sitting. Again.*

[look at camera] Back in June, I'd already given Safeeely's back office — the screen only I see, where I handle disputes and payouts — one big redesign. [pause] But it wasn't consistent yet. Different fonts on different pages, headers that didn't match, labels shouting in all caps in one place and normal everywhere else.

[show screen] So I went through all eight admin pages — dashboard, disputes, payouts, analytics, all of it — and made them actually feel like one product instead of eight prototypes stitched together.

[smile] Felt great. Looked clean. Looked done.

[lean in] Except one of those eight pages was quietly lying to me. [pause] That's next.

### TikTok 2/3 — 3 boxes become 44 controls

*The page that decided that same day: the settings page had to actually become real.*

[pause] Up until then, the "settings" page in my Safeeely admin panel was basically three text boxes. That's it. [show screen] But an escrow platform has a LOT to configure — what percentage fee we take, how fast payouts go out, what counts as valid ID for KYC, how disputes get assigned, whether the referral program is even on.

[lean in] So I rebuilt it into seven real sections — fees, payouts, referrals, KYC, disputes, platform features, security — 44 individual settings total, each with its own save button.

[smile] I flipped every toggle, hit save on every section, felt like I was running a real company for a second.

[pause] Narrator: it did not save. [look at camera] Why — tomorrow.

### TikTok 3/3 — You are the QA team

*"Looks done" and "is done" are not the same thing. I learned this the hard way, same day.*

[pause] I'd just built out a full settings panel for Safeeely — 44 controls across fees, payouts, KYC, disputes. Looked amazing. [show code/screen] Then I actually tested it like a real admin would, and almost none of it saved.

[lean in] Turned out the server was only listening for about 10 of the 44 fields — everything else got silently dropped. On top of that, true/false toggles were turning into NaN, and a 10% fee I set was being saved as 1000% because of a missing percent conversion.

[smile] As a solo founder, there's no QA team catching this before it ships. [look at camera] You ARE the QA team. [pause] Fixed all of it that same day — but it's a good reminder every builder needs eventually.

---

## X posts

### X 1/3

Back in June, I spent a day just making Safeeely's admin dashboard feel like ONE product instead of eight pages that all grew up separately.

Same fonts. Same headers. Same spacing rules everywhere.

Small, unglamorous, and honestly one of the most satisfying days of the build.

### X 2/3

Safeeely's admin "settings" page used to be 3 text boxes.

One day in June I turned it into 7 real sections — fees, payouts, KYC, disputes, referrals, security — 44 actual controls over how the whole platform behaves.

Felt like flipping on the lights in a room I'd only been guessing in.

### X 3/3

Built a slick 44-field settings panel for Safeeely. Flipped every toggle. Hit save.

Almost none of it actually saved.

The server only recognized 10 of 44 fields, booleans were turning into NaN, and a 10% fee was saving as 1000%.

Solo founder life: you ARE the QA team. Caught it, fixed it same day.

---

## LinkedIn posts

### LinkedIn 1/2 — Narrative

*I built a settings page. Flipped every toggle. Hit save on all 7 sections. Felt like a real company for about ten seconds.*

Then I refreshed the page.

Almost none of it had saved.

This was back in June, deep into building Safeeely, the AI-escrow platform I run out of Telegram, Discord, WhatsApp, Instagram and Apple Messages bots for people trading on social media, freelancing, or moving crypto.

That day I'd already spent hours making the admin back office — the screen only I see, where I manage disputes and payouts — visually consistent across all 8 pages. Same fonts, same headers, same design language everywhere. It looked genuinely professional for the first time.

Then I turned to the settings page, which up to that point was three sad text boxes pretending to control a whole platform. I rebuilt it properly: fee structure, payout thresholds, KYC rules, dispute handling, referral program, security — 44 real settings across 7 sections.

I tested it the way an admin actually would. Toggle something. Save it. Check it stuck.

It didn't.

The API was only listening for a fraction of those 44 fields — the rest vanished into nothing. Boolean toggles were turning into NaN. And a 10% fee I set was about to get stored as 1000%, because nobody had written the code to convert the percentage the UI shows into the decimal the database expects.

None of that would have shown up from just looking at the screen. It only showed up because I tested it like the person who'd actually rely on it.

I fixed all of it that same day. But the gap between "this looks finished" and "this is finished" is one I keep rediscovering, and I don't think it ever fully goes away.

### LinkedIn 2/2 — Insight

*A pretty UI is the easiest thing to fake. It is also the thing that fools you the fastest — including fooling yourself.*

While building Safeeely, I hit a moment that I think every solo technical founder eventually hits.

I'd just finished making the admin back office look genuinely professional — consistent fonts, consistent headers, a real design system across all 8 pages instead of a patchwork. Then I rebuilt the settings page from 3 placeholder text boxes into 44 real controls: fees, payouts, KYC rules, dispute handling, referral settings, security.

Visually, it was the best that panel had ever looked.

Functionally, it barely worked. The backend only recognized a handful of the 44 fields. Toggles silently turned into invalid values. A 10% fee was one missing conversion away from being saved as 1000%.

Here's the lesson I keep relearning: a good-looking screen and a working system are two completely different projects, and only one of them is visible from a screenshot.

When you're building solo, there's no QA team, no second engineer glancing at your PR, no designer flagging "hey, did you actually click save?" You are the only line of defense between "looks shipped" and "is shipped" — which means the habit of testing your own work like a suspicious stranger isn't optional, it's the job.

I've started treating every new feature the same way now: build it, then immediately try to break it as if I didn't write it. It's slower. It's also the only thing that's saved me from shipping something that quietly costs someone money.
