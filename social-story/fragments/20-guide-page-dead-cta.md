# Day 20 - The guides/delivery page rebuild and the dead-end CTA

**Commit range:** `bf4f9ff434dea425c5177c14b6950875c0c21e7f` .. `984a83277e285a83fb7815a7e9c561621b6fceeb`
(July 6, 2026 - both commits, same morning)

- `bf4f9ff4` feat(frontend): rebuild guides/delivery page to match Claude redesign
- `984a8327` fix(frontend): remove dead Dashboard CTAs from guides/delivery page

This batch reached `backfillCutoffSha` - backfill is complete as of this fragment; `state.json` mode flips to `"live"`.

---

## TikTok scripts

### TIKTOK 1/3 - Rebuilding the public guides page

Ever ship a page and then, forty minutes later, catch yourself asking "wait... who is this actually FOR?" [pause] That happened to me back in July.

I'd been handed a design for our "how delivery works" guide page - the one that explains Safeeely to a total stranger who's never heard of us. So I rebuilt it piece by piece: the hero section, the warning banner, four cards breaking down each way a deal can be delivered, the whole thing. [show code/screen] Even had to go dig up a missing italic font weight just so one line of the headline rendered the way it was supposed to.

Pushed it live. Felt good. [smile] But something about it was still bugging me...

[lean in] Turned out I wasn't done yet.

### TIKTOK 2/3 - The dead-end button

I looked at my own new page like a stranger would, and I caught myself. [pause]

Every button on it - the nav bar, the footer, all of it - said "Dashboard." Made total sense... if you're already a Safeeely user. But this page's entire job was to explain what Safeeely even IS to someone who is NOT logged in. [look at camera] So picture it: someone reads the whole guide, gets curious, clicks the button... and gets walled off, told to log into an account they don't have yet.

Two lines of code. Two dead links. Fixed it in under five minutes. [show code/screen] Tiny fix. But it's the kind of mistake that's invisible until you force yourself to read your own page as a first-time visitor, not as the person who built it.

### TIKTOK 3/3 - Hot take

Hot take: your prettiest page is worthless if the button on it doesn't know who's reading. [pause]

I spent hours making a guide page pixel-perfect - fonts, spacing, banners, all of it. And the thing that almost broke it wasn't design, it was a single word on a button written for the wrong audience. [look at camera] It's so easy as a founder to build every page assuming the reader is you - logged in, already sold, already inside the product. Most of your visitors aren't. They're strangers, deciding in ten seconds whether to trust you.

[lean in] Design gets the compliments. Audience-awareness is what actually keeps people from bouncing. I'll take the second one every time.

---

## X posts

### X 1/3

Back in July I rebuilt Safeeely's public "how delivery works" guide page from scratch - hero, warning banner, four cards explaining every way a deal can be delivered. Even had to add a whole missing italic font weight just to get one headline to render right.

Shipped it. Felt great for about 40 minutes.

### X 2/3

Then I noticed every button on that brand-new guide page said "Dashboard." Great, if you're already logged into Safeeely. Terrible, if you're the exact person that page was written for: a total stranger who's never signed up.

Read a whole guide, click the button, get walled off. Fixed it in two lines.

### X 3/3

Hot take: a pixel-perfect page means nothing if the CTA on it was written for you, not your visitor.

I spent hours on fonts and spacing for that guide page. The thing that almost broke it was one word on a button, aimed at the wrong person. Design gets the compliments. Audience-awareness is what keeps people from bouncing.

---

## LinkedIn posts

### LINKEDIN 1/2 - The page I built for the wrong reader

I spent a good chunk of a July morning making one page pixel-perfect.

It was Safeeely's public "how delivery works" guide - the page meant to explain, in plain terms, how our escrow actually protects a deal. Hero section. A warning banner. Four cards, one for each way a delivery can play out. I even had to track down a missing font weight because one line of the headline refused to render in italics the way the design called for.

I shipped it and moved on, satisfied.

About forty minutes later, I opened it again - not as the person who built it, but as someone landing on it cold. And I noticed something I'd completely missed the first time.

Every single call-to-action on that page - the nav bar, the footer - said "Dashboard."

That's a perfectly normal link... on a page built for existing users. This page was the opposite. Its entire reason for existing was to explain Safeeely to someone who had never heard of it and definitely didn't have an account yet.

So imagine that person: they read the whole guide, get convinced, click the button to go further - and get stopped cold, asked to log into an account that doesn't exist for them.

The fix was two lines of code. The lesson took longer to shake off.

It's such an easy trap as a solo founder: you build every page assuming the reader is you - already logged in, already sold, already inside the product. Most visitors are the opposite of that. They're strangers, deciding in seconds whether to trust what they're looking at.

### LINKEDIN 2/2 - Design gets the compliments. Audience-awareness keeps people from leaving.

Here's a lesson from four-plus months of building Safeeely solo: the part of your product people compliment is almost never the part that determines whether they stick around.

I recently rebuilt one of our public pages to match a design I was genuinely proud of - clean hero, clear sections, careful typography down to a specific italic font weight. It looked right. And it very nearly shipped with a button that quietly told every first-time visitor to go log into an account they didn't have.

Nobody notices a broken CTA in a screenshot. Everybody notices it when they're the one who just hit a dead end.

The uncomfortable habit that catches this kind of thing is simple to describe and easy to skip: stop reading your own pages as their builder. Read them as the stranger who has zero context, zero trust, and ten seconds of patience. Ask, specifically, "what does THIS visitor need to be true right now?" - not "does this look good?"

Good design is necessary. It's just not sufficient. The founders whose products actually convert are the ones who keep re-asking who's on the other side of every button, every single time - not just once, at launch.

That single question, asked one extra time on an ordinary Monday morning, is what turned a dead-end page into one that actually works for the people it was built for.
