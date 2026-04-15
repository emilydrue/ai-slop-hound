# SlopHound

> **Beta** — This app is in active development. If something flags incorrectly or misses obvious slop, leave a comment in [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev) and tag it as [Bug], [False Positive], [Missed Detection], or [Feature Request].

AI slop detection mod tool for Reddit. Scans posts and comments for AI-generated content and alerts moderators.

## What it does

SlopHound automatically scans new posts and comments in your subreddit. When it detects likely AI-generated content, it can:

- Report to the mod queue
- Send modmail
- Comment on the post (if bark visibility is set to public)
- Auto-remove (if configured)

When you install the app, SlopHound sends a welcome modmail explaining the default settings and how to configure them.

## Detection

SlopHound uses statistical signals to score content. No external API calls — everything runs locally in milliseconds.

Detection details are intentionally kept private to prevent gaming.

## Settings

Configure in Mod Tools > Installed Apps > ai-slop-hound > Settings.

Settings are grouped separately for **posts** and **comments**, each with their own:

- **Enable/disable** — Turn scanning on or off for that content type
- **Detection threshold (0-100)** — Content scoring below this triggers alerts. Higher = stricter
- **Action mode** — Alert only (report + modmail) or auto-remove
- **Bark visibility** — Public comment or mod-only (quiet mode). Defaults to mod-only
- **Minimum text length** — Content shorter than this is skipped. Default: 100 characters

### Threshold guide

The threshold is a sensitivity dial, not a measured precision guarantee. Start at the default and adjust based on what you see in your subreddit.

| Band | Behavior |
|---|---|
| **Lenient** (≤40) | Flags only the most obvious AI content. Expect misses on well-prompted AI. |
| **Balanced** (45, default) | Alerts on most AI content while leaving casual/messy human posts alone. |
| **Strict** (50–55) | Alerts on well-disguised AI. Expect occasional flags on articulate human writing — review before removing. |
| **Aggressive** (60+) | Likely to flag human posts that are polished, formal, or unusually structured. Use alert-only, not auto-remove. |

Tune based on your sub's norms. If you see false positives, use **Trust This User** to allowlist and lower the threshold a few points. Detection is imperfect — alert-only mode is the recommended default.

## Mod actions

SlopHound adds mod actions to posts, comments, and the subreddit:

- **SlopHound: Sniff This Post / Comment** — Manual scan on demand
- **SlopHound: Trust This User** — Add the author to the allowlist. SlopHound will skip them in future scans
- **SlopHound: Untrust This User** — Remove the author from the allowlist
- **SlopHound: Not Slop (False Positive)** — Log a detection as incorrect for accuracy tracking
- **SlopHound: View Stats** — See total scans, alerts, false positives, and accuracy rate
- **SlopHound: View Trusted Users** — See the full allowlist

## Limitations

No detector is perfect. Very short content doesn't give much to work with, and articulate humans can occasionally get flagged — use the "Trust This User" action to allowlist them.

## Changelog

### Unreleased (dev branch)

- Labeled-corpus regression tests for the scorer (see `tests/`)
- ESL-aware suppression: formal-grammar and contraction-avoidance penalties are reduced when a genuine ESL apology is present
- README threshold guide reframed as qualitative bands rather than precision claims

### 3.0.0

- Major detection engine overhaul
- Title scanning for clickbait patterns
- Improved scoring formula with better human/AI separation
- Reduced false positives on single-paragraph posts, ESL writers, and niche subreddit formats
- Compliance: scan data cleaned up when posts/comments are deleted

### 2.4.4

- Improved AI detection
- Simplified public bark comments

### 2.4.0

- Improved detection accuracy
- Reduced false positives on genuine human posts
- Better scoring calibration

### 2.2.0

- Separate settings for posts and comments
- Enable/disable toggle for each content type

### 2.0.0

- Major detection engine improvements
- Trusted users allowlist
- False positive logging
- Stats view from subreddit menu
- Welcome modmail on install
- Bark visibility defaults to mod-only

### 1.0.0

- Initial public release

## Feedback & discussion

All discussion about SlopHound happens at [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev). Post there with one of these tags:

- **[Bug]** — Something broke
- **[False Positive]** — Flagged a real human
- **[Missed Detection]** — Didn't catch obvious AI
- **[Feature Request]** — Something you'd like added
