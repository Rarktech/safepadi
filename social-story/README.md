# social-story

Weekly automated job that mines `main`'s commit history in order and turns each
batch into a fragment of a serialized "building Safeeely" story, delivered to
Peter on Telegram as an X thread, a LinkedIn post, and a TikTok voiceover script.

Scheduled as a durable cloud routine (via the `/schedule` skill / RemoteTrigger),
not an in-session cron — it needs to survive for months to get through the backlog.

## state.json

- `mode`: `"backfill"` while replaying history older than `backfillCutoffSha`,
  then flips to `"live"` once caught up — live runs only cover commits landed
  since the last run.
- `lastProcessedCommitSha`: cursor; `null` means start from the repo's first commit.
- `backfillCutoffSha`: HEAD at the time this system was set up — the backfill
  finish line.
- `fragmentIndex`: increments once per run, used in the archive filename.
- `recap`: 2-4 sentence running summary of the story so far, so each new
  fragment can reference earlier beats instead of starting cold.

## fragments/

One archive file per run (`NN-slug.md`) containing that week's X thread,
LinkedIn post, and TikTok script — a durable backup since Telegram messages
get lost/scrolled past.

## Format rules

- **X thread**: numbered tweets, each strictly ≤280 characters (free-tier
  limit, no Premium long-form). Hook first tweet, soft cliffhanger last tweet.
- **LinkedIn**: single post, hook line first (LinkedIn truncates after ~3
  lines), personal/reflective tone, line-break formatting, hard ceiling 3000
  characters.
- **TikTok**: spoken voiceover script, ~90-150 words (~40-60s at natural
  pace), hook first line, casual spoken cadence with beat/cue markers — not
  written prose.
