# Safeeely 4-Agent Self-Learning Dispute System
> Constitutional AI Pipeline — Architectural Plan

**Rating: 87/100 — Build This Now (in phases)**

---

## Executive Summary

The current 3-stage pipeline (Investigator → Judge → Reviewer) is a solid foundation but has critical gaps: no persistent learning, no evidence tiering, no double-dip detection, no self-healing loop. This document designs the full upgrade to a **4-agent constitutional pipeline** that gets smarter with every dispute it resolves.

The 4 agents:
1. **Forensic Investigator** — Gathers evidence with forensic rigor and "How-To" paths
2. **Constitutional Judge** — Renders structured JSON verdicts anchored in utility logic
3. **Adversarial Critic (Red Team)** — Stress-tests every verdict for logical flaws
4. **Evolutionary Chronicler** — Writes new SOPs when the Critic rejects; the system legislates itself

**Engineering effort: 11–13 working days.** Build Phase 1+2 first (6 days), earn the right to Phase 3+4 with production data.

---

## The Problem With the Current System

From `packages/api/src/services/gemini.ts` and `routes/disputes.ts`:

| Gap | Current State | Impact |
|---|---|---|
| No persistent learning | Every dispute is fresh; Gemini has no memory of past cases | Same fraud patterns succeed repeatedly |
| Shallow reputation | Only `count(past_disputes)` — no outcome weighting | Repeat fraudsters look the same as honest users |
| Soft Reviewer | "VERDICT_APPROVED" string sniff; rejection = human escalation, no retry | High human escalation rate on fixable cases |
| No evidence tiering | Model treats a screenshot the same as a blockchain tx hash | Low-quality evidence can swing verdicts |
| No double-dip detection | Buyer can get refund AND keep digital asset | Critical escrow gap on account trades |
| No dispute-type routing | Same prompt for an Instagram account sale and a freelance coding job | Wrong burden of proof, wrong evidence requests |
| No self-healing | When a verdict is wrong, nothing is learned for next time | System doesn't improve |

---

## The Tiered Pipeline Architecture

Not every dispute needs 4 agents. Over-engineering a $20 dispute wastes cost and adds latency.

```
Any new dispute message
    ↓
CLASSIFIER (once on raise, gemini-flash-lite, ~$0.0001)
    → assigns dispute_type + pipeline_tier
    ↓
    ├── LITE (low-amount, simple):
    │     Investigator → Judge  (current speed, no Critic)
    │
    ├── STANDARD (default):
    │     Investigator → Judge → Critic
    │     (rejection → human escalation)
    │
    └── CONSTITUTIONAL (high-value, digital assets, repeat actors):
          Investigator → Judge → Critic
          (rejection → Chronicler → Judge retry → Critic)
          (max 2 retries before human escalation)
```

**CONSTITUTIONAL triggers:**
- `amount × fx_rate > $2,000`, OR
- `dispute_type` is any `*_ACCOUNT` or `CRYPTO_*` type, OR
- Either party has `trust_score < 30` or active `fraud_flags`, OR
- Critic rejected once (auto-promote from STANDARD)

---

## Dispute Type Taxonomy

Classify on raise. Store in `disputes.dispute_type`. Different types → different evidence checklists, different burden-of-proof defaults.

| Type Code | Domain | Tier 1 Evidence | Common Fraud | Default Burden |
|---|---|---|---|---|
| `INSTAGRAM_ACCOUNT` | IG handle sale | Login Activity CSV, Account Center export, OGE email proof | Buyer claims "can't login" while still holding session | **Buyer high** — digital handover is irreversible |
| `DISCORD_ACCOUNT` | Discord account | Audit Log export, Account Standing page | Seller resets password post-sale | **Seller high** — reversible if seller acts fast |
| `TELEGRAM_ACCOUNT` | TG channel/account | Active Sessions list, forwarded message metadata | Seller retains second session | **Seller medium** |
| `GMAIL_ACCOUNT` | Google account | Last Account Activity, security event log | Recovery email/phone retention | **Seller very high** |
| `FREELANCE_CODE` | Code delivery | Git commit hash, repo collaborator list, deploy logs | "Doesn't work" when it does | **Buyer medium** |
| `FREELANCE_DESIGN` | Design files | File metadata, Figma version history | Scope creep disguised as defect | **Both equal** |
| `FREELANCE_WRITING` | Articles/copy | Document version history, plagiarism scan | AI-generated content passed as human | **Seller medium** |
| `CRYPTO_TO_GOODS` | Crypto for physical | Tx hash + confirmation count, POD | Wrong address, claiming non-payment | **Buyer very high** |
| `PHYSICAL_GOODS` | Social commerce | Carrier API status, signed POD, unboxing video | Empty box / wrong SKU | **Seller medium** |
| `SOCIAL_SERVICE` | Followers/views | Platform analytics + before/after timestamped | Bot followers that drop | **Seller high** |
| `GENERIC` | Fallback | Case-specific | Mixed | **Both equal** |

---

## Agent 1 — Forensic Investigator

**Model: `gemini-flash-latest`** (multimodal needed for image evidence)

### What changes from current

Current investigator: free-text prompt, outputs prose + `[RESTRICT: X]` tag.

Upgraded investigator: **structured JSON output** with evidence tier classification and specific forensic "How-To" paths.

### What it receives

- Transaction context, dispute reason, last 20 messages
- Downloaded image attachments (multimodal)
- `dispute_type` evidence checklist (from `disputeTypes.ts`)
- Top 8 active SOPs for this dispute_type (INVESTIGATOR-scoped)
- Top 5 known fraud patterns for this type
- Enriched reputation (trust_score, ghosting history, fraud_flags) for both parties

### Output JSON

```json
{
  "facts_summary": "Neutral 2-3 sentence summary",
  "evidence_tier_assessment": [
    { "message_id": "uuid", "tier": 1, "tags": ["BLOCKCHAIN_TX", "CSV_EXPORT"] }
  ],
  "missing_evidence": [
    {
      "from": "BUYER",
      "evidence_name": "Instagram Login Activity CSV",
      "how_to_path": "On desktop: Settings > Privacy > Accounts Center > Password and security > Login activity > Download.",
      "why_needed": "Proves you have no active session after the handover.",
      "blocks_judgment": true
    }
  ],
  "self_score": 94,
  "facts_complete": false,
  "restrict_to": "BUYER",
  "user_facing_message": "..."
}
```

### Evidence Tiers

| Tier | Description | Examples |
|---|---|---|
| **Tier 1 (High Trust)** | Verifiable, platform-generated, metadata-rich | Carrier API logs, Login Activity CSV export, screen recordings, blockchain tx hash, Git commit hashes |
| **Tier 2 (Medium Trust)** | Third-party evidence with some verifiability | Chat logs from third-party apps, "Success" message screenshots from major platforms |
| **Tier 3 (Low Trust)** | Self-reported, easily forged, no metadata | Written statements, anecdotal claims, cropped/edited screenshots, casual photos |

### Quality Gate

Implemented as **chain-of-thought self-evaluation inside the same prompt** — NOT a second API call (would double latency). The prompt ends with:

> "Before emitting your JSON, internally score your output 0-100 on: (a) Did I provide a specific platform navigation path for every evidence request? (b) Did I correctly assign burden based on the dispute_type rules? (c) Did I avoid asking for evidence already provided? If score < 90, rewrite before emitting. Include `self_score` in your JSON."

### "How-To" Path Library

Platform-specific paths live in `config/disputeTypes.ts` and are injected into the prompt — no hallucinated navigation:

```ts
EVIDENCE_HOW_TO = {
  INSTAGRAM_ACCOUNT: {
    LOGIN_CSV: "On desktop: Settings & privacy > Accounts Center > Password and security > Login activity > '...' menu > Download data. Upload the resulting file.",
    OGE_EMAIL: "Open the email inbox tied to the account. Search 'instagram.com email change'. Forward that email as an attachment (not screenshot) so email headers are preserved.",
    ACTIVE_SESSIONS: "Settings & privacy > Accounts Center > Password and security > Where you're logged in. Screenshot the full list with timestamps visible."
  },
  DISCORD_ACCOUNT: {
    AUDIT_LOG: "Server Settings > Audit Log, filtered to last 7 days. Screenshot with timestamps visible.",
    ACCOUNT_STANDING: "User Settings > Account Standing. Screenshot the full page."
  },
  BLOCKCHAIN: {
    TX_HASH: "Paste the transaction hash from your wallet (starts with 0x... or is a long string). We verify it on-chain directly."
  }
}
```

---

## Agent 2 — Constitutional Judge

**Model: `gemini-2.5-pro` for STANDARD/CONSTITUTIONAL, `gemini-flash-latest` for LITE**

This is the biggest model upgrade — reasoning quality here directly determines verdict accuracy.

### Core Logic Principles

**The Utility Binary:** Every ruling must answer: *"Who currently holds the functional utility of the asset?"*

**The Deprivation Rule:** If the Seller has permanently lost an irreversible asset (e.g., credentials handed over and OGE changed), the Buyer's burden to prove "broken" status increases by 50%.

**The Clean Hands Doctrine:** Any detected fraud or non-cooperation triggers an Adverse Inference — the disputed fact is assumed against the non-cooperative party.

**Evidence Hierarchy:**
- LEVEL 1: Blockchain records, Platform auth logs, Carrier API logs
- LEVEL 2: Metadata-rich visuals, timestamped platform exports
- LEVEL 3: Raw screenshots, unverified platform messages
- LEVEL 4: Written statements, anecdotal claims (automatically discarded if LEVEL 1-3 exists)

### Output JSON (upgraded schema)

```json
{
  "action": "REFUND_BUYER" | "PAY_SELLER" | "SPLIT",
  "split_pct_buyer": 0,
  "verdict_summary": "Neutral 2-3 sentence verdict for both parties.",
  "reasoning": "Detailed evidence-based reasoning trace.",

  "utility_location": "BUYER_HAS_FUNCTIONAL_UTILITY" | "SELLER_HAS_FUNCTIONAL_UTILITY" | "NEUTRALIZED_OR_CONTESTED",
  "utility_evidence_refs": ["message_uuid_1", "message_uuid_2"],

  "burden_of_proof_status": {
    "assigned_to": "BUYER" | "SELLER" | "BOTH",
    "assigned_to_reason": "...",
    "met": true,
    "adjustment_factor": 1.5,
    "adjustment_reason": "Deprivation Rule: seller has permanently lost asset."
  },

  "conflicting_evidence_resolution": [
    {
      "conflict": "Buyer Tier 3 login error screenshot vs Seller Tier 1 Account Center export",
      "ruled_in_favor_of": "SELLER",
      "rule_applied": "Evidence Hierarchy: LEVEL 1 supersedes LEVEL 3"
    }
  ],

  "fallacy_check": {
    "sunk_cost_detected": false,
    "appeal_to_pity_detected": false,
    "false_equivalence_detected": false,
    "notes": ""
  },

  "precedence_check": {
    "sops_consulted": ["SOP-IG-004", "GLOBAL-002"],
    "binding_sops_applied": ["SOP-IG-004"],
    "deviation_from_precedent": false,
    "deviation_justification": ""
  },

  "double_dip_check": {
    "applicable": true,
    "risk_present": false,
    "mitigation": "Seller confirmed credential reset per SOP-IG-004."
  },

  "clean_hands": {
    "buyer_clean": true,
    "seller_clean": true,
    "adverse_inference_triggered_against": null
  }
}
```

Every `sops_consulted` entry increments `hit_count` on that SOP row — this feeds the priority-decay system.

---

## Agent 3 — Adversarial Critic (Red Team)

**Model: `gemini-flash-latest`** — structured rule-checking is Flash-shaped, Pro is overkill.

### What it audits

Takes the Judge's full JSON and runs 7 mechanical checks:

1. **Confirmation Bias** — Did Judge weight Tier 3 over Tier 1?
2. **Fallacy Audit** — Re-verify sunk_cost, appeal_to_pity, false_equivalence by reading user messages directly.
3. **Utility Reconciliation** — Does `utility_location` match `action`? (`BUYER_HAS_FUNCTIONAL_UTILITY` + `REFUND_BUYER` = FAIL.)
4. **Double-Dip Test** — Can the buyer retain both money AND asset post-verdict? Critical for `*_ACCOUNT` types.
5. **SOP Compliance** — Did Judge apply all `HARD_GATE` SOPs for this dispute_type?
6. **Burden Math** — If `adjustment_factor: 1.5`, did the burdened party provide proportionally stronger evidence?
7. **Deviation Sanity** — If `deviation_from_precedent: true`, is the justification structurally sound?

### Output

```json
{
  "verdict": "APPROVED" | "REJECTED",
  "failures": [
    {
      "check": "DOUBLE_DIP_TEST",
      "severity": "BLOCKING",
      "explanation": "Buyer receives refund but seller has not confirmed credential reset. Buyer could reclaim account via original recovery method.",
      "remediation_hint": "Request seller-side proof of credential reset before any REFUND_BUYER ruling."
    }
  ],
  "confidence": 0.85
}
```

**Tuning note:** Start with `confidence >= 0.6` threshold for rejection. Tighten to 0.7 once you have 30+ real rejected verdicts to calibrate against. First 2 weeks expect 30–40% rejection rate as the system calibrates.

---

## Agent 4 — Evolutionary Chronicler

**Model: `gemini-2.5-pro`** — it's writing constitutional law; reasoning quality is mandatory.

**Only invoked on Critic rejection in CONSTITUTIONAL tier.** LITE/STANDARD rejections → direct human escalation (avoids SOP-spam from low-quality cases).

### What it does

1. **Classifies root cause:**
   - `DATA_POVERTY` — Investigator didn't get the right evidence
   - `LOGIC_POVERTY` — Judge had the evidence but reasoned incorrectly
   - `EVIDENCE_TIER_MISWEIGHT` — Low-tier evidence was treated as high-tier
   - `DOUBLE_DIP_RISK` — Escrow gap wasn't caught
   - `OTHER`

2. **Checks for conflicts/redundancy** against existing SOPs (via embedding cosine-similarity > 0.92 = redundant)

3. **Drafts new SOP** — must be ≤ 2 procedural steps (anti-fragility mandate). Enforced in code:
   ```ts
   const sentences = rule_body.match(/Step \d:/g)?.length ?? 0;
   if (sentences > 2) throw new Error('POLICY_TOO_COMPLEX — escalate to human');
   ```

4. **Saves to `dispute_sops` table** — HARD_GATE SOPs require admin approval before they bind; ADVISORY/BINDING auto-activate.

5. **Logs to `dispute_evolution_log`** — every SOP creation is traceable to the failure that created it.

6. **Returns new SOP body** — injected into the Judge's next retry call.

### Oscillation Prevention

Before generating a new SOP, check if ≥ 3 SOPs have already been created for the same `dispute_type + root_cause` combo in the last 30 days. If yes → the system is stuck oscillating → human escalation instead.

---

## The Self-Healing Loop

```
critic_iterations = 0
critic_max_iterations = 2

LOOP:
  judge_output = Judge(facts + sops + precedents)
  store judge_output in disputes.last_judge_payload
  critic_output = Critic(judge_output)

  if APPROVED:
      execute verdict → resolve dispute → write to adjudications table (RAG)
      break

  critic_iterations += 1

  if critic_iterations > critic_max_iterations:
      human escalation (is_ai_paused = true)
      break

  if pipeline_tier != CONSTITUTIONAL:
      human escalation immediately (LITE/STANDARD don't get Chronicler)
      break

  chronicler_output = Chronicler(judge_output, critic_output, existing_sops)

  if POLICY_TOO_COMPLEX or oscillation detected:
      human escalation
      break

  insert new SOP → dispute_sops
  log to dispute_evolution_log

  // loop back with new SOP injected
```

**Max 2 retries.** After that, the system is signaling genuine ambiguity — human wins.

---

## Double-Dip Detection (The Critical Safeguard)

For `*_ACCOUNT` types, the Investigator asks **preemptively before any verdict** — not just as a Critic check.

**From Buyer immediately on raise:**
> "Please run [Platform] > Security > Active Sessions export right now and upload it. This proves you currently have NO active session on the account — critical to rule out asset retention after handover."

**From Seller immediately on raise:**
> "Please upload: (a) screenshot of your active sessions on the account showing zero active devices, AND (b) the platform email confirming the recovery email was successfully transferred to the Buyer."

**Seeded hard rule (`SOP-GLOBAL-DIGITAL-DOUBLE-DIP-001`) — active from day 1:**
> "Step 1: For digital account disputes, verify buyer has no active session via platform export. Step 2: REFUND_BUYER MUST NOT be issued if buyer cannot produce a no-active-session export dated AFTER the dispute was raised."

This SOP is seeded at migration time — the system starts knowing this rule, not waiting to discover it.

---

## Memory Persistence Strategy

**File-based memory CANNOT work on Render** — filesystem is wiped on every deploy/restart. All memory is Postgres-backed.

### Two-tier loading

**Hot Memory (loaded into every prompt):**
- 5–10 highest-priority active SOPs for the matched dispute_type
- Top 5 known fraud patterns for the type
- Compact (~1-2 KB) text block injected into system prompt

**Cold Memory (RAG on demand):**
- Top 3 most similar adjudicated cases via pgvector cosine similarity on `fact_embedding`
- Retrieved and injected into the Judge's context only

### Memory Bloat Defense

Four mechanisms prevent the prompt from degrading as SOPs accumulate:

1. **Priority decay** — hourly cron decrements priority on SOPs not consulted in 60 days. Below threshold → `ARCHIVED`.
2. **Conflict detection** — new SOP embedding compared against existing (cosine > 0.92 = redundant, reject or merge).
3. **2-step mandate** — rule_body sentence-counted in code; >2 steps → rejected, human reviews.
4. **Hard cap** — max 15 ACTIVE SOPs per dispute_type. Oldest unused gets archived when 16th proposed.

---

## New Database Schema

### `dispute_sops` — The body of constitutional law the system generates

```sql
CREATE TABLE dispute_sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_code TEXT UNIQUE NOT NULL,              -- 'SOP-IG-004', 'GLOBAL-002'
    title TEXT NOT NULL,
    rule_body TEXT NOT NULL,                    -- max ~400 chars, ≤2 procedural steps
    rule_embedding VECTOR(768),                 -- for conflict detection via pgvector
    dispute_type TEXT NOT NULL,                 -- 'INSTAGRAM_ACCOUNT' | 'GLOBAL' | etc.
    applies_to_agent TEXT NOT NULL
        CHECK (applies_to_agent IN ('INVESTIGATOR','JUDGE','CRITIC','ALL')),
    severity TEXT NOT NULL
        CHECK (severity IN ('ADVISORY','BINDING','HARD_GATE')),
    priority INTEGER NOT NULL DEFAULT 50,       -- 0-100, decays hourly cron
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','ARCHIVED','SUPERSEDED','PENDING_HUMAN_REVIEW')),
    superseded_by UUID REFERENCES dispute_sops(id),
    origin_dispute_id UUID REFERENCES disputes(id),
    hit_count INTEGER NOT NULL DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    human_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sops_active_type
    ON dispute_sops(dispute_type, applies_to_agent, status, priority DESC);
```

### `dispute_forensic_memory` — Known fraud patterns and tampering techniques

```sql
CREATE TABLE dispute_forensic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name TEXT UNIQUE NOT NULL,          -- 'IG_LOGIN_ERROR_SCREENSHOT_ALONE'
    description TEXT NOT NULL,
    dispute_type TEXT NOT NULL,
    indicators JSONB NOT NULL,                  -- {keywords:[], image_signals:[], red_flags:[]}
    counter_evidence_needed JSONB NOT NULL,
    severity TEXT NOT NULL
        CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    confirmed_fraud_count INTEGER NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `dispute_evolution_log` — Chronicle of every rejection + learning event

```sql
CREATE TABLE dispute_evolution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    failure_id TEXT UNIQUE NOT NULL,            -- 'FAIL-2026-05-14-001'
    iteration INTEGER NOT NULL,
    root_cause TEXT NOT NULL
        CHECK (root_cause IN ('DATA_POVERTY','LOGIC_POVERTY','EVIDENCE_TIER_MISWEIGHT','DOUBLE_DIP_RISK','OTHER')),
    critic_objections JSONB NOT NULL,
    judge_payload JSONB NOT NULL,               -- the rejected verdict
    chronicler_output JSONB NOT NULL,
    sop_created_id UUID REFERENCES dispute_sops(id),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `dispute_adjudications` — Case precedents for RAG retrieval

```sql
CREATE TABLE dispute_adjudications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    dispute_type TEXT NOT NULL,
    fact_summary TEXT NOT NULL,
    fact_embedding VECTOR(768),                 -- pgvector for similar-case search
    final_action TEXT NOT NULL,
    split_pct_buyer INTEGER,
    utility_location TEXT NOT NULL,
    evidence_tier_top INTEGER NOT NULL,
    sops_applied UUID[] NOT NULL DEFAULT '{}',
    human_overrode_ai BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_adj_embedding
    ON dispute_adjudications USING ivfflat (fact_embedding vector_cosine_ops);
```

### `profile_reputation` — Enhanced reputation for burden-of-proof modulation

```sql
CREATE TABLE profile_reputation (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    disputes_raised_count INTEGER NOT NULL DEFAULT 0,
    disputes_against_count INTEGER NOT NULL DEFAULT 0,
    disputes_won_as_buyer INTEGER NOT NULL DEFAULT 0,
    disputes_lost_as_buyer INTEGER NOT NULL DEFAULT 0,
    disputes_won_as_seller INTEGER NOT NULL DEFAULT 0,
    disputes_lost_as_seller INTEGER NOT NULL DEFAULT 0,
    ghosted_count INTEGER NOT NULL DEFAULT 0,   -- SLA timeouts where they were silent
    fraud_flags JSONB NOT NULL DEFAULT '[]',    -- ['DOUBLE_DIP_ATTEMPT','TIER3_SPAM']
    trust_score INTEGER NOT NULL DEFAULT 50,    -- 0-100
    last_dispute_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Trust Score formula:**
```
trust_score = 50
  + 5 × disputes_won_as_seller
  + 5 × disputes_won_as_buyer
  - 8 × disputes_lost_as_seller
  - 8 × disputes_lost_as_buyer
  - 4 × ghosted_count
  - 15 × len(fraud_flags)
  [clamped to 0–100]
```

### Alterations to existing `disputes` table

```sql
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS critic_iterations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS critic_max_iterations INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS pipeline_tier TEXT NOT NULL DEFAULT 'STANDARD'
        CHECK (pipeline_tier IN ('LITE','STANDARD','CONSTITUTIONAL')),
    ADD COLUMN IF NOT EXISTS last_judge_payload JSONB,
    ADD COLUMN IF NOT EXISTS evidence_tier_seen INTEGER;

ALTER TABLE dispute_messages
    ADD COLUMN IF NOT EXISTS evidence_tier INTEGER,
    ADD COLUMN IF NOT EXISTS evidence_tags JSONB DEFAULT '[]';
```

---

## Model Selection Per Agent

| Agent | Model | Rationale | Approx cost/call |
|---|---|---|---|
| Classifier (once per dispute) | `gemini-flash-lite` | One-shot type detection | ~$0.0001 |
| Investigator | `gemini-flash-latest` | Multimodal + frequent (every message) | ~$0.003 |
| Judge (LITE) | `gemini-flash-latest` | Low-stakes, simple reasoning | ~$0.002 |
| Judge (STANDARD/CONSTITUTIONAL) | `gemini-2.5-pro` | Reasoning quality is the product | ~$0.04 |
| Critic | `gemini-flash-latest` | Structured rule-check is Flash-shaped | ~$0.002 |
| Chronicler | `gemini-2.5-pro` | Writing constitutional law | ~$0.04 |
| Embeddings (SOPs, adjudications) | `text-embedding-004` | Cheap, fast, persistent | ~$0.00001 |

**Cost per dispute:**
- LITE (low-value, simple): ~$0.015
- STANDARD (5 messages, 1 verdict): ~$0.07
- CONSTITUTIONAL with 1 Critic retry: ~$0.20
- CONSTITUTIONAL with 2 retries (max): ~$0.35

**At 1,000 disputes/month (70% LITE / 25% STANDARD / 5% CONSTITUTIONAL):** ~$60/month. Trivial vs. human mediator hours saved.

---

## What Changes in the Codebase

### `packages/api/src/services/gemini.ts` → becomes a module directory

```
packages/api/src/services/dispute-ai/
  index.ts                      // exports processAIDispute() — same name, same DB lock contract
  classifier.ts                 // classifyDisputeType()
  context-loader.ts             // loadDisputeContext() — txn + history + reputation + sops + memory
  agents/
    investigator.ts             // runInvestigator(ctx) → InvestigatorOutput
    judge.ts                    // runJudge(ctx, inv_out) → JudgeOutput
    critic.ts                   // runCritic(judge_out, ctx) → CriticOutput
    chronicler.ts               // runChronicler(judge_out, critic_out, ctx) → ChroniclerOutput
  memory/
    sop-repository.ts           // loadActiveSops(), recordSopHit(), insertSop()
    forensic-memory.ts          // loadPatterns()
    adjudication-rag.ts         // findSimilarCases(embedding)
  prompts/
    investigator.prompt.ts
    judge.prompt.ts
    critic.prompt.ts
    chronicler.prompt.ts
    classifier.prompt.ts
  config/
    disputeTypes.ts             // type → checklist + how-to paths
    seedSops.ts                 // 15-20 bootstrap SOPs (including the Double-Dip rule)
  utils/
    json-parse.ts               // robust JSON extraction + schema validation
    multimodal.ts               // image download + base64 (from current gemini.ts)
    embeddings.ts               // Gemini embedding API wrapper
  types.ts                      // all output JSON interfaces
```

**Public surface stays IDENTICAL:** `processAIDispute(disputeId)` returns the same `{ type, content, action?, split_pct_buyer?, restrict? }` envelope. The orchestrator in `disputes.ts` does not need to change its handler logic.

### `packages/api/src/routes/disputes.ts` — 4 surgical changes only

1. **POST `/raise`** — after insert, call `classifyDisputeType()` → persist `disputes.dispute_type` and `pipeline_tier`. Upsert `profile_reputation` for both parties.

2. **POST `/:id/messages`** — call `quickTierHint(content, attachments)` and save `evidence_tier` + `evidence_tags` to the inserted `dispute_messages` row.

3. **`runAIForDispute`** — extend result handler to set `disputes.pipeline_tier` and read back `disputes.critic_iterations` for telemetry.

4. **New admin endpoints:**
   - `GET /admin/sops` — list all SOPs with filter by type/status
   - `POST /admin/sops/:id/approve` — approve a HARD_GATE SOP
   - `POST /admin/sops/:id/archive` — manually archive a SOP
   - `GET /:id/evolution-log` — the AI's "thought process" trail for a dispute

### What stays EXACTLY the same

- DB-level lock (`processing_locked_at`) — keep it, it's solid
- SLA cron (`/cron/timeouts`) — untouched
- `ai_rounds` counter — stays as the user-question-bombing limiter (separate from `critic_iterations`)
- `sendVerdictNotifications()` — fully untouched
- Evidence upload route (`POST /:id/upload`) — untouched
- Admin takeover (`is_ai_paused`) — untouched
- `[RESTRICT: X]` system → now read from `investigator_out.restrict_to` (same values)

---

## Reputation-Based Burden of Proof Modulation

The Investigator gets a reputation block injected into its prompt. Example:

> "**Reputation Context:**
> Buyer: trust_score=28, raised 8 disputes, lost 7. Flag: DOUBLE_DIP_ATTEMPT.
> **Rule:** The Investigator will require Tier-1 evidence (not screenshots) from the Buyer before recommending any REFUND action. Adverse Bias doctrine applies."

Burden adjustment multipliers:

| Condition | Multiplier |
|---|---|
| `trust_score < 30` | ×1.5 |
| `DOUBLE_DIP_ATTEMPT` in fraud_flags | ×2.0 |
| `disputes_lost > disputes_won × 2` | ×1.3 |
| `ghosted_count > 2` | ×1.25 |

---

## Quick Tier Pre-Classification

At message insert time (before AI runs), a deterministic `quickTierHint()` function classifies attachments cheaply:

```ts
function quickTierHint(content: string, attachments: any[]) {
  const tags: string[] = [];
  if (/0x[a-f0-9]{64}/i.test(content)) tags.push('BLOCKCHAIN_TX');     // Tier 1
  if (attachments.some(a => /\.csv$/i.test(a.name))) tags.push('CSV_EXPORT');    // Tier 1
  if (attachments.some(a => /\.har$|\.log$/i.test(a.name))) tags.push('API_LOG'); // Tier 1
  if (attachments.some(a => /\.(mp4|mov|webm)$/i.test(a.name) && a.size > 1_000_000))
    tags.push('SCREEN_RECORDING'); // Tier 1
  if (attachments.some(a => a.type?.startsWith('image/') && a.size > 500_000))
    tags.push('HIGH_RES_PHOTO'); // Tier 2
  const tier = tags.some(t => ['BLOCKCHAIN_TX','CSV_EXPORT','API_LOG','SCREEN_RECORDING']
    .includes(t)) ? 1 : tags.length > 0 ? 2 : 3;
  return { tier, tags };
}
```

The Investigator can then override this with its vision analysis (e.g., downgrade a "HIGH_RES_PHOTO" to Tier 3 if it sees cropping artifacts).

---

## Bootstrap SOPs (Seed on Migration)

These 15 SOPs are seeded from day 1 so the system starts smart:

| Code | Type | Rule (2 steps max) |
|---|---|---|
| `SOP-GLOBAL-DIGITAL-DOUBLE-DIP-001` | `*_ACCOUNT` | Step 1: Request buyer's no-active-session export before verdict. Step 2: REFUND_BUYER MUST NOT be issued without it. |
| `SOP-GLOBAL-DIGITAL-OGE-001` | `*_ACCOUNT` | Step 1: Require seller proof that Original Account Email (OGE) was transferred. Step 2: Without OGE proof, PAY_SELLER only if buyer confirms initial access + has active session. |
| `SOP-IG-2HOUR-RULE-001` | `INSTAGRAM_ACCOUNT` | Step 1: If buyer confirmed initial access, any subsequent reclamation claim requires OGE email proof. Step 2: Without OGE reclamation proof, default to PAY_SELLER — buyer assumed risk of securing the asset. |
| `SOP-GLOBAL-GHOSTING-001` | `GLOBAL` | Step 1: If AI questions go unanswered for >24h by the party bearing burden of proof. Step 2: Issue Default Warning; if unanswered >48h, SLA_TIMEOUT resolution applies. |
| `SOP-FREELANCE-SCOPE-001` | `FREELANCE_*` | Step 1: Request original written brief/scope document from the dispute raiser. Step 2: Disputes citing defects not in the original brief are classified as scope creep — default to PAY_SELLER. |
| `SOP-GLOBAL-TIER3-ONLY-001` | `GLOBAL` | Step 1: If only Tier 3 evidence exists from the burdened party, issue one Tier 1 request with 24h deadline. Step 2: If still only Tier 3, apply Adverse Inference against burdened party. |
| `SOP-CRYPTO-TX-001` | `CRYPTO_*` | Step 1: Require transaction hash from sending party. Step 2: Verify on-chain; if confirmed receipt address matches agreed address, PAY_SELLER regardless of buyer claims. |
| `SOP-PHYSICAL-POD-001` | `PHYSICAL_GOODS` | Step 1: Request carrier API tracking status + Proof of Delivery signature. Step 2: Confirmed POD = PAY_SELLER; disputed POD = request unboxing video. |
| `SOP-GLOBAL-FRAUD-FLAG-001` | `GLOBAL` | Step 1: If either party has DOUBLE_DIP_ATTEMPT fraud flag, require Tier 1 for ALL claims — Tier 3 is automatically disqualified. Step 2: Any verified new fraud attempt adds to fraud_flags. |
| `SOP-GLOBAL-SPLIT-MANDATE-001` | `GLOBAL` | Step 1: SPLIT verdicts require documented partial delivery (not "to be fair"). Step 2: Split % must correspond to the documented delivered portion — never arbitrary. |

*(5 more to be added based on first 30 days of production data)*

---

## Phased Build Plan

### Phase 1 — Foundation (Days 1–3)
**Goal: structured Judge JSON + dispute_type classification + reputation table. Current 3-stage pipeline, dramatically smarter.**

- Day 1: Run new SQL migrations. Seed 15 initial SOPs. Backfill `profile_reputation`.
- Day 2: Refactor `gemini.ts` → modular structure. Add Classifier. Upgrade Judge to rich JSON schema.
- Day 3: Wire `dispute_type` and `pipeline_tier`. A/B test with `NEW_DISPUTE_PIPELINE=1` env flag.

### Phase 2 — Critic + Self-Healing Loop (Days 4–6)
**Goal: the Critic agent live, retry loop with human escalation on rejection.**

- Day 4: Implement `critic.ts` with 7 audit checks. Wire `critic_iterations` counter.
- Day 5: Replay 50 archived disputes, measure false rejection rate. Tune confidence threshold.
- Day 6: Production rollout for CONSTITUTIONAL tier (top 50% by amount) only. Watch admin escalation queue.

### Phase 3 — Chronicler + Self-Learning (Days 7–9)
**Goal: full self-healing loop. The system starts writing its own SOPs.**

- Day 7: Implement `chronicler.ts` + oscillation guard + SOP embedding conflict check.
- Day 8: Build admin SOP review UI endpoints. HARD_GATE approval flow.
- Day 9: Production rollout. First SOPs auto-generated.

### Phase 4 — Hardening (Days 10–13)
- Day 10: pgvector RAG for `dispute_adjudications` — similar-case retrieval into Judge.
- Day 11: Telemetry — Critic rejection rate, SOP creation rate, root_cause distribution, cost/dispute, automation rate.
- Days 12–13: Prompt tuning rounds from production failures. Trust score calibration.

---

## Honest Tradeoffs

**What this gets right:**
- Preemptive double-dip detection beats reactive detection every time.
- DB-backed SOPs with priority decay solves the memory bloat problem the doc's file-based approach never addresses.
- Tiered pipeline (LITE/STANDARD/CONSTITUTIONAL) prevents over-engineering cheap disputes.
- Rich Judge JSON gives users and admins a transparent trail — they see exactly why the AI ruled the way it did.

**What's risky:**
- **JSON instability.** 12-field schemas fail more than 4-field ones. Use Gemini's `responseMimeType: "application/json"` + `responseSchema` parameter — it's significantly more reliable than asking nicely. Budget ~20% of build time for JSON-mode prompt tuning.
- **SOP drift.** After ~3 months, SOPs may subtly contradict. Schedule quarterly admin SOP audits. Don't trust the system to self-prune perfectly.
- **Abuse vector.** A pathological CONSTITUTIONAL dispute with 2 full retries costs ~$0.35. Rate-limit: max 3 active disputes per profile at any time.
- **The taxonomy will be wrong.** `dispute_type` will miss edge cases. Keep it unconstrained TEXT (not enum) so new types can be added without migrations.

**What to cut if you need to ship faster:**
- **Cut the Chronicler from v1.** Investigator → Judge → Critic with human escalation on rejection gets 80% of the quality for 60% of the effort. Add Chronicler in month 2 once you have ~100 real rejected verdicts to seed it from.
- **Cut pgvector RAG from v1.** SOP injection alone is enough for launch. Similar-case retrieval is a polish feature for month 2.

---

## Expected Product Impact

| Metric | Current | After Phase 1+2 | After Phase 3+4 |
|---|---|---|---|
| Human escalation rate | Baseline | -30–40% for `*_ACCOUNT`/`CRYPTO_*` types | Additional -10–15% across all types |
| Verdict acceptance (no appeal) | Baseline | +20–30% (transparent utility logic) | +40% (precedent-referenced verdicts) |
| Double-dip incidents | Unknown | Near zero on `*_ACCOUNT` types | Eliminated (preemptive SOP enforcement) |
| Time to resolution (AI cases) | Minutes–hours | -20% (faster structured output) | -30% |
| System learning | None | None | Continuous (new SOPs per rejected verdict) |

**The biggest unlock is trust, not speed.** When a user sees:
> `"SOP-IG-004 applied: buyer confirmed initial access, failed to provide OGE reclamation proof within 24h. Utility permanently transferred to buyer."` 

...they accept the ruling instead of disputing it. That reduces human escalation more than any automation target.

---

## The Real Moat

This system — once it has 6 months of SOP accumulation — is not replicable in weeks. Escrow.com, Tazapay, and every competitor would need to:

1. Build the same 4-agent pipeline
2. Accumulate the same dispute-type-specific SOPs
3. Build the same platform-specific evidence How-To library
4. Build the same reputation layer with ghosting/fraud flag history

That's 12–18 months of production learning. **The system's value is in its accumulated constitutional law, not its code.**

This is the dispute resolution moat that makes Safeeely's AI Dispute API B2B-sellable — as described in `EMBEDDED_API_STRATEGY.md`.
