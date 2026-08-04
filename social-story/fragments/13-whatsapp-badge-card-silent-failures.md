# Day 13 - WhatsApp badge cards, for real this time

Commits covered: `c7a132cebbc1745966788a8d78baadf7523c6070..894976accf2780f18aac1c09e69c8339e71da19f` (both July 1, 2026)

- `c7a132ce` - fix(whatsapp): show review badges and rating in reviews section
- `894976ac` - fix(badge-card): output PNG instead of WebP for WhatsApp compatibility

---

## TikTok 1/2 - Day 13: "Fixed" on two platforms, invisible on the third

[hook, look at camera]
I shipped badge cards. Telegram, worked. Discord, worked. I told myself the feature was done.
[pause]
Then a WhatsApp user asked me where their trust badge was. Nothing. No image, no error, nothing.
[lean in]
Turned out my server was handing WhatsApp a link to fetch the image from — but that link pointed at my *internal* address. Telegram and Discord don't work that way, they just download the file directly, so this bug had nowhere to hide until WhatsApp came along.
[show code/screen]
Meta's servers literally could not reach that URL from the outside. I swapped it for the public one, and suddenly WhatsApp could see what everyone else already had.
[smile]
One feature, three platforms, three different ways to quietly fail. And that wasn't even the last surprise on this one.

## TikTok 2/2 - Day 13: The bug that never threw an error

[hook, pause]
Same day, same badge card feature — I found a second bug hiding behind the first one.
[look at camera]
Even after WhatsApp could reach the image, it still wasn't showing up. No crash, no failed request in my logs. Just silence.
[lean in]
Turns out WhatsApp's API only accepts JPEG or PNG for image links. I was sending WebP. It didn't reject it loudly — it just silently dropped it and moved on like nothing happened.
[show code/screen]
Switched the output format to PNG, and it started working immediately.
[pause]
That's the bug that scares me most as a solo builder — the one that doesn't tell you it failed. [smile] Makes you wonder how many of those are still sitting out there right now.

---

## X 1/2 - Day 13

Shipped badge cards on Telegram, Discord, WhatsApp. Telegram and Discord worked instantly.

WhatsApp showed... nothing.

Turned out I was sending WhatsApp's servers a link to MY server's internal address. They literally could not reach it from the outside. Swapped it for the public URL. Fixed.

## X 2/2 - Day 13

The scariest bugs are the ones that don't throw an error.

WhatsApp only accepts PNG or JPEG images. I was sending WebP. No crash. No failed request. It just silently swallowed the image and said nothing.

Switched to PNG. Instantly fixed.

Silent failures are the worst kind — because nothing tells you to go look.

---

## LinkedIn 1/2 - Day 13 (narrative)

I thought the badge card feature was done.

Telegram worked. Discord worked. I moved on.

Then a WhatsApp user asked me a simple question: "where's my badge?"

Nothing. No image. No error in my logs. Just... nothing.

I spent longer than I'd like to admit staring at working code before I found it: my server was sending WhatsApp a link to fetch the badge image from — and that link pointed at my server's *internal* address. Telegram and Discord never hit this, because they download the image file directly instead of following a link. WhatsApp does it differently, and Meta's servers simply could not reach that internal URL from the outside world.

I swapped it for the public-facing URL. It worked immediately.

And then, same day, I found a second bug sitting right behind it: even with the link fixed, WhatsApp still wasn't showing the badge. No error there either. It turned out WhatsApp's API only accepts JPEG or PNG for image links — I was generating WebP. It didn't reject it loudly. It just quietly dropped it.

Two bugs, same feature, same day, both completely silent.

The lesson I keep relearning building Safeeely solo: "it works" only means it works on the platform you tested it on. Every one of my six bots has its own quirks, its own limits, its own way of failing without telling you.

## LinkedIn 2/2 - Day 13 (insight)

The most dangerous bugs in software aren't the ones that crash. They're the ones that fail silently.

A crash tells you something is wrong immediately. A silent failure tells you nothing — the request "succeeds," the code moves on, and the only sign anything is broken is a user quietly wondering why a feature isn't working, if they even bother to ask at all.

I hit this twice in one day building Safeeely's badge card feature. WhatsApp couldn't reach an internal server URL — no error, just a missing image. Then WhatsApp silently rejected an unsupported image format — no error, just a missing image again.

Two completely different root causes. Identical symptom: nothing.

Building across six different platforms (Telegram, Discord, WhatsApp, Instagram, Messenger, Apple Business) has taught me that "it works" is a meaningless sentence unless you specify where. Every platform has its own undocumented edge cases, and the ones that fail silently are the ones that erode trust the fastest — because you don't even know they're happening until a real user tells you.

If you're building something multi-platform: assume every integration has at least one silent failure mode you haven't found yet. Go looking for it before your users do.
