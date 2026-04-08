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

| Threshold | What to expect |
|---|---|
| 40 | Barely catches anything |
| 55 | Catches obvious slop |
| 65 | Catches most AI content |
| 75 | Catches well-disguised AI, some false positives |
| 85+ | Aggressive, will flag a lot, expect to review manually |

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

### 2.4.1

- Simplified public bark comments
- Cleaned up user-facing text

### 2.4.0

- Detect absence of human texture in long posts (no typos, slang, fragments, or profanity in 600+ words is suspicious)
- Detect AI phrase recycling within posts
- Compound red flag multiplier — stacking AI tells amplifies detection
- Expanded engagement bait patterns
- Added human authenticity markers that actively reduce AI probability (playful language, parenthetical asides, missing hyphens, casual spelling)
- Unicode em dash treated as strong AI signal
- Prose polish detection for consistently perfect grammar
- Expanded emotional vocabulary and flat-affect detection
- Account age and karma no longer boost trust (farmed accounts)

### 2.2.0

- Separate settings for posts and comments (independent thresholds, actions, visibility, min length)
- Enable/disable toggle for each content type
- Settings grouped into Post and Comment sections

### 2.0.0

- Major detection engine upgrade with 70+ AI fingerprint words and phrases
- Em dash, contraction avoidance, empty intensifier, and dramatic pattern detection
- Narrative AI slop detection (transformation arcs, engagement bait, rhetorical structure)
- Scoring details removed from all user-facing output
- Trusted users allowlist with View Trusted Users action
- False positive logging with Not Slop action
- Stats view from subreddit menu
- Welcome modmail on install
- Bark visibility defaults to mod-only

### 1.0.0

- Initial public release
- Statistical AI content detection (no external API calls)
- Configurable threshold, action mode, bark visibility
- Manual scan via post/comment menu
- Modmail alerts and mod queue reporting

## Feedback & discussion

All discussion about SlopHound happens at [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev). Post there with one of these tags:

- **[Bug]** — Something broke
- **[False Positive]** — Flagged a real human
- **[Missed Detection]** — Didn't catch obvious AI
- **[Feature Request]** — Something you'd like added
