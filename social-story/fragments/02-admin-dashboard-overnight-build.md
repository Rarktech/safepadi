# Fragment 2 — the overnight admin dashboard build (and the two bugs that followed)

Commit range: `0423215033adf20bebf1b33117fb91ba31fd032d` .. `44c1bed822adc253085893e69696353bc6192b4a` (2026-06-27, 1:44am–2:05am, 3 commits)

Delivery note: Slack and Telegram were both unreachable from this sandbox (outbound network policy returned 403 on CONNECT to hooks.slack.com and api.telegram.org). All 5 messages below were delivered as Gmail drafts to peterrichard013@gmail.com instead.

## TikTok 1/4 — Day 2: The Overnight Admin Build

At 1am I decided to build my entire admin dashboard. All of it. In one sitting. [pause] Not tweak it — build it from scratch. Fraud queue, trust scores, revenue analytics, marketplace moderation, a whole system-health page with cron jobs I could re-run by hand. Ten new pages. Thirty-plus new backend endpoints. [show code/screen] Twenty items on my checklist, and I didn't let myself stop until every single one was done. [lean in] That's the thing about building solo — there's no one to tell you "that's enough for tonight." So I just kept going. [smile] Finished at 1:44am. Genuinely thought I was done. [pause] I was very wrong.

## TikTok 2/4 — Day 2: The Part Nobody Films

Nobody films their admin panel. But it's the part that actually keeps a platform honest. [pause] When two people have a dispute over an escrow deal, a real human has to review it — and if one specialist gets buried in cases while another sits idle, that's not fair to anyone. [show code/screen] So that same night I built a workload-balancer: new disputes auto-route to whoever has the fewest open cases, plus 24 and 72 hour reminders so nothing quietly stalls. [pause] It's not the part anyone screenshots. But it's the difference between "trust us" and actually earning it. [lean in] I built it the same night everything else almost fell apart.

## TikTok 3/4 — Day 2: Then It Wouldn't Even Build

Twenty minutes after I finished the whole admin dashboard — it wouldn't even build. [pause] TypeScript just refused. Turns out Supabase's database calls don't support the normal `.catch()` you'd reach for on a promise, and I had it sprinkled across five different background database writes — the quiet ones, like cron logging and dispute auto-routing, that are supposed to just work without anyone noticing. [show code/screen] One-line fix, five places. Fixed it, felt good, moved on. [smile] Eleven minutes later, a way scarier bug showed up. [pause] One I couldn't just patch and forget.

## TikTok 4/4 — Day 2: Locked Out Of My Own Dashboard

I built the whole dashboard, and then I couldn't log into it. [pause] Login worked for half a second, then booted me straight back out. Turns out the cookie proving I was logged in was scoped to my API's address — but the page checking if I was logged in lived somewhere else entirely. [show code/screen] Two doors, and my key only worked on one. The browser just never sent it. [pause] Fixed it by storing the token myself and attaching it to every request by hand. Dashboard finally worked. [lean in] But staring at it, I already knew — the way it looked wasn't going to survive contact with real users. [smile] That one's next.

## X Post — Day 2

1/ Spent last night building my entire Safeeely admin dashboard in one sitting: 10 new pages, dispute auto-routing, fraud queue, revenue analytics. Finished at 1:44am feeling unstoppable.

2/ 20 min later: wouldn't even build. Then I got locked out of my own login. Solo building, unfiltered.

## LinkedIn

Not sent — today (2026-07-12) is not a Monday.
