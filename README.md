# SlopHound

> **Beta** — This app is in active development. If something flags incorrectly or misses obvious slop, leave a comment in [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev) and tag it as [Bug], [False Positive], [Missed Detection], or [Feature Request].

AI slop detection mod tool for Reddit. Scans posts and comments for AI-generated content and alerts moderators.

## What it does

SlopHound automatically scans new posts and comments in your subreddit. When it detects likely AI-generated content, it can:

- Comment on the post with a severity rating (1-5 barks)
- Report to the mod queue
- Send modmail with a score breakdown
- Auto-remove (if configured)

## Detection

SlopHound uses statistical signals to score content. No external API calls — everything runs locally in milliseconds.

**What it catches:**
- Common AI phrases and ChatGPT fingerprints
- Hedging language and buzzword density
- Uniform paragraph structure
- Fake-casual writing (AI mimicking Reddit voice with "lmao" and "literally" while writing perfectly structured essays)
- Suspiciously perfect anecdote structure (agree with OP, tell a story, add one more point)
- Overly agreeable comments with no real pushback
- Low-specificity content, flat emotional tone
- New/low-karma accounts

Each post gets an **authenticity score from 0-100%**. Lower = more likely AI-generated.

## Settings

Configure in Mod Tools > Installed Apps > ai-slop-hound > Settings.

### Threshold (0-100)

Posts scoring below this authenticity level trigger alerts. Higher = more aggressive.

| Threshold | What to expect |
|---|---|
| 40 | Barely catches anything |
| 55 | Catches obvious slop |
| 65 | Catches most AI content |
| 75 | Catches well-disguised AI, some false positives |
| 85+ | Aggressive, will flag a lot, expect to review manually |

### Action mode

- **Alert only** (default) — Comments on the post, reports to mod queue, sends modmail. Post stays up.
- **Auto-remove** — Removes the post immediately and notifies mods. Use with a well-tuned threshold.

### Bark visibility

- **Public comment** (default) — SlopHound replies on the post.
- **Mod-only** — No public comment. Reports and modmail only.

### Minimum text length

Posts/comments shorter than this are skipped. Default: 100 characters.

## Manual scan

Mods can scan any post or comment on demand via the three-dot menu > **"SlopHound: Sniff This Post"** / **"SlopHound: Sniff This Comment"**. Works regardless of threshold settings.

## Limitations

This is a statistical detector. It catches most AI-generated content but has known gaps:

- Well-prompted AI that's been specifically told to mimic a human Reddit voice can sometimes pass
- Very short posts/comments don't give the scorer enough to work with
- Articulate humans occasionally get flagged — use "alert only" mode so mods can override

We're actively improving detection. LLM-based scoring is planned for a future release.

## Feedback & discussion

All discussion about SlopHound happens at [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev). This is a beta — post there with one of these tags:

- **[Bug]** — Something broke
- **[False Positive]** — Flagged a real human
- **[Missed Detection]** — Didn't catch obvious AI
- **[Feature Request]** — Something you'd like added
