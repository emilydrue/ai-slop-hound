# SlopHound

> **Beta** — This app is in active development. If something flags incorrectly or misses obvious slop, leave a comment in [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev) and tag it as [Bug], [False Positive], [Missed Detection], or [Feature Request].

AI slop detection mod tool for Reddit. Scans posts and comments for AI-generated content and alerts moderators.

## What it does

SlopHound automatically scans new posts and comments in your subreddit. When it detects likely AI-generated content, it can:

- Report to the mod queue
- Send modmail
- Comment on the post (if bark visibility is set to public)
- Auto-remove (if configured)

When you install the app, SlopHound sends a welcome modmail explaining the default settings and available actions.

## Detection

SlopHound uses statistical signals to score content. No external API calls — everything runs locally in milliseconds.

Each post gets an internal authenticity score. Lower scores are more likely AI-generated. Detection details are intentionally kept private to prevent gaming.

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

- **Alert only** (default) — Reports to mod queue, sends modmail. Post stays up.
- **Auto-remove** — Removes the post immediately and notifies mods. Use with a well-tuned threshold.

### Bark visibility

- **Mod-only** (default) — No public comment. Reports and modmail only.
- **Public comment** — SlopHound replies on the post.

### Minimum text length

Posts/comments shorter than this are skipped. Default: 100 characters.

## Mod actions

Available via the three-dot menu on any post or comment:

- **SlopHound: Sniff This Post / Comment** — Manual scan on demand. Works regardless of threshold settings.
- **SlopHound: Trust This User** — Add the author to the allowlist. SlopHound will skip them in future scans.
- **SlopHound: Untrust This User** — Remove the author from the allowlist.
- **SlopHound: Not Slop (False Positive)** — Log a detection as incorrect. Helps us track accuracy and improve.

Available via the three-dot menu on the subreddit:

- **SlopHound: View Stats** — See total scans, alerts, false positives, and accuracy rate.
- **SlopHound: View Trusted Users** — See the full allowlist.

## Limitations

No detector is perfect. Very short content doesn't give much to work with, and articulate humans can occasionally get flagged — use the "Trust This User" action to allowlist them.

## Changelog

### 1.1.0

- Trusted users allowlist
- False positive logging and accuracy tracking
- Stats view from subreddit menu
- Welcome modmail on install
- Improved detection engine
- Bark visibility defaults to mod-only
- Scoring details removed from all user-facing messages

### 1.0.0

- Initial public release
- Configurable threshold, action mode, bark visibility
- Manual scan via post/comment menu
- Modmail alerts and mod queue reporting

## Feedback & discussion

All discussion about SlopHound happens at [r/ai_slop_hound_dev](https://www.reddit.com/r/ai_slop_hound_dev). This is a beta — post there with one of these tags:

- **[Bug]** — Something broke
- **[False Positive]** — Flagged a real human
- **[Missed Detection]** — Didn't catch obvious AI
- **[Feature Request]** — Something you'd like added
