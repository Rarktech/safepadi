# Day 11 — badge files that were never staged, and the trust text that quietly vanished

**Commits covered:** `f5622caf68bbc884a90fad6493c40c1f3e472cf1` → `03e1c458471e2338ad77c2d2ca486a6a87c90a93` (June 30, 2026)

- `f5622caf` feat(badges): commit badge layer images and notification award images
- `03e1c458` fix(reviews): restore original text phrasing + badge list across all bots

---

## TikTok Scripts

### TikTok 1/2 — Day 11: "It worked on my laptop"

I shipped a feature that worked perfectly... on my laptop. [pause] Then it 500'd for every single user in production. [look at camera] I'd built this badge card thing — sixteen image layers, backgrounds, silhouettes, colored badges, little award notification graphics. Tested it locally, looked great, moved on. [show code/screen] What I didn't realize — I'd copied those image files onto my machine in a totally separate work session, days earlier, and just... never actually staged them into git. They were sitting on my hard drive the whole time, not in the repo. [pause] So Render — where the actual app runs — only has what's committed. No files, no badge, straight 500 error. [lean in] The fix was one git add away. The lesson wasn't. [smile] Next time — I go back to what almost got permanently deleted along with it.

### TikTok 2/2 — Day 11: "I deleted the words to add a picture"

Here's a mistake I almost didn't catch. [pause] I added a nice visual badge card — trust score, reviews, the whole thing as one clean image. Looked so much better than plain text. [show code/screen] Except when I built it, I quietly stripped out the actual text that used to go with it — "you have a trust score of X, based on Y reviews," the full list of badges someone had actually earned. [pause] The picture looked great. But it told people less than the boring text version ever did. [look at camera] Users didn't just want it to look nice — they wanted the receipts. The number. The proof. [lean in] So I put both back — the image AND the words — across all six bots. [smile] Design that hides information isn't design. It's a downgrade wearing a nice outfit.

---

## X Posts

### X 1/2 — Day 11

Shipped a badge feature. Tested it locally — worked perfectly. Pushed to production — instant 500 for every user.

Turns out I'd copied 16 image files onto my laptop in an earlier session and just... never git added them. They existed everywhere except the one place that mattered: the repo.

"Works on my machine" is not a flex. It's a warning.

### X 2/2 — Day 11

Almost shipped a UX downgrade disguised as an upgrade.

Added a slick visual badge card for trust scores. Looked great. But in the process I quietly deleted the actual text — the number, the review count, the list of earned badges.

A pretty picture that tells you less isn't better design. It's just prettier and worse.

---

## LinkedIn Posts

### LinkedIn 1/2 — Day 11 (Narrative)

The bug that scared me most this build wasn't a crash. It was silence.

I'd built a badge card feature for Safeeely — sixteen composited image layers: backgrounds, white silhouettes for locked badges, full-color versions for earned ones, plus five little award notification graphics that fire off when someone unlocks one.

Tested it on my machine. Looked exactly right.

Pushed it live. Instant 500 error, for every single user.

I dug in expecting a code bug. It wasn't. The image files themselves — the actual .webp assets the whole feature depended on — had been copied onto my laptop in an entirely separate work session, days earlier. I'd used them locally to test. I never actually staged them into git.

So on my machine, everything was there. In production, on Render, the filesystem only has what's committed to the repo. Nothing else exists. The feature was reaching for sixteen files that, as far as the live server was concerned, had never been created.

One `git add`. That was the entire fix.

But the deeper lesson stuck with me: "it works on my machine" isn't reassurance. It's the first sign something is about to break for everyone else. Local state and shipped state are not the same thing, no matter how confident the demo looked.

### LinkedIn 2/2 — Day 11 (Insight)

A pretty interface can be a worse product. Here's what taught me that.

While building Safeeely's badge card — a nice visual summary of someone's trust score and reviews — I made it look genuinely good. One clean image instead of a wall of text.

Then I actually compared it to what it replaced.

The old version said things like "you have a trust score of 4.8, based on 23 reviews" and listed every badge someone had earned, by name. Plain. Unglamorous. Also — I hadn't noticed — actually informative.

The new image looked sharp but, on its own, told users less. No explicit number. No review count. No named list of what they'd earned. Just a nice-looking card.

I'd optimized for "looks impressive" and quietly regressed on "tells you the truth clearly."

The fix wasn't choosing between them. It was refusing to see it as a choice — ship the image AND keep the words, across every bot the feature touches.

The lesson I keep relearning building this thing: your users don't experience your intentions, they experience what's actually on the screen. A redesign that removes information isn't a simplification. It's a debt you're hoping nobody notices — until someone does.
