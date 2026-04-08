import { Devvit } from '@devvit/public-api';
import { cleanText } from './textCleaner.js';
import { scorePost } from './scorer.js';
import { getBarkLevel, generateBarkComment, generateModMessage } from './bark.js';
import { saveScanResult, hasBeenScanned, claimBarkSlot } from './storage.js';
import type { ActionMode, AuthorInfo, BarkVisibility, ScanResult } from './types.js';

Devvit.configure({ redditAPI: true, redis: true });

// ---------------------------------------------------------------------------
// Settings — mod-configurable via the subreddit app settings panel
// ---------------------------------------------------------------------------

Devvit.addSettings([
  {
    name: 'slopThreshold',
    type: 'number',
    label: 'Slop detection threshold',
    helpText:
      'Posts scoring below this authenticity level (0-100) trigger alerts. Higher = stricter (flags more posts). Default: 45',
    defaultValue: 45,
  },
  {
    name: 'actionMode',
    type: 'select',
    label: 'Action when slop is detected',
    options: [
      { label: 'Alert only (comment + modmail)', value: 'alert-only' },
      { label: 'Auto-remove post', value: 'auto-remove' },
    ],
    defaultValue: ['alert-only'],
  },
  {
    name: 'barkVisibility',
    type: 'select',
    label: 'Bark visibility',
    options: [
      { label: 'Public comment on post', value: 'public' },
      { label: 'Mod-only (quiet mode)', value: 'mod-only' },
    ],
    defaultValue: ['mod-only'],
  },
  {
    name: 'minimumTextLength',
    type: 'number',
    label: 'Minimum text length to scan (characters)',
    helpText: 'Posts shorter than this are ignored. Default: 100',
    defaultValue: 100,
  },
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ContextWithRedis {
  reddit: Devvit.Context['reddit'];
  redis: Devvit.Context['redis'];
  settings: Devvit.Context['settings'];
}

async function getAuthorInfo(
  reddit: Devvit.Context['reddit'],
  authorName: string,
): Promise<AuthorInfo> {
  try {
    const user = await reddit.getUserByUsername(authorName);
    if (!user) return { accountAgeDays: null, karma: null };
    const now = Date.now();
    const created = user.createdAt.getTime();
    const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    const karma = user.linkKarma + user.commentKarma;
    return { accountAgeDays: ageDays, karma };
  } catch {
    return { accountAgeDays: null, karma: null };
  }
}

async function loadSettings(context: ContextWithRedis) {
  const [thresholdRaw, actionModeRaw, visibilityRaw, minLenRaw] =
    await Promise.all([
      context.settings.get<number>('slopThreshold'),
      context.settings.get<string[]>('actionMode'),
      context.settings.get<string[]>('barkVisibility'),
      context.settings.get<number>('minimumTextLength'),
    ]);

  return {
    threshold: ((thresholdRaw as number) ?? 45) / 100,
    actionMode: ((actionModeRaw as string[])?.[0] ?? 'alert-only') as ActionMode,
    visibility: ((visibilityRaw as string[])?.[0] ?? 'mod-only') as BarkVisibility,
    minLength: (minLenRaw as number) ?? 100,
  };
}

/**
 * Core scanning logic shared by the trigger and the manual menu action.
 * Accepts a minimal context interface so both Devvit.Context and
 * TriggerContext can be used.
 */
async function scanPost(
  context: ContextWithRedis,
  postId: string,
  options?: { force?: boolean; showToast?: (msg: string) => void },
): Promise<ScanResult | null> {
  const { redis, reddit } = context;

  // Dedup unless forced (manual scan)
  if (!options?.force && (await hasBeenScanned(redis, postId))) return null;

  let post;
  try {
    post = await reddit.getPostById(postId);
  } catch {
    return null; // Post was deleted before we could scan it
  }
  const body = post.body ?? '';
  const settings = await loadSettings(context);

  if (body.length < settings.minLength) return null;

  const cleaned = cleanText(body);
  const authorName = post.authorName ?? '[deleted]';
  const authorInfo = await getAuthorInfo(reddit, authorName);
  const score = scorePost(cleaned, authorInfo, post.score);
  const barkLevel = getBarkLevel(score.overall);

  let actionTaken: ScanResult['actionTaken'] = 'none';

  if (score.overall < settings.threshold) {
    const postUrl = `https://www.reddit.com${post.permalink}`;

    // Public bark comment — only once per thread (atomic claim)
    if (settings.visibility === 'public' && barkLevel.barks > 0) {
      if (await claimBarkSlot(redis, postId)) {
        const comment = generateBarkComment(score);
        if (comment) {
          const reply = await reddit.submitComment({
            id: postId,
            text: comment,
          });
          try { await reply.distinguish(true); } catch { /* missing mod perms */ }
          actionTaken = 'commented';
        }
      }
    }

    // Modmail notification
    try {
      const modMessage = generateModMessage(
        score,
        post.title,
        postUrl,
        authorName,
      );
      await reddit.sendPrivateMessage({
        to: `/r/${post.subredditName}`,
        subject: `SlopHound Alert [${barkLevel.barks}/5] — ${post.title.slice(0, 50)}`,
        text: modMessage,
      });
    } catch {
      // Modmail can fail if the bot doesn't have permission — non-fatal
    }

    // Auto-remove or report to mod queue
    if (settings.actionMode === 'auto-remove') {
      await post.remove(false);
      actionTaken = 'removed';
    } else {
      // Always report to mod queue so it shows up for review
      await reddit.report(post, {
        reason: `SlopHound: ${barkLevel.barks}/5 barks — authenticity ${(score.overall * 100).toFixed(0)}%`,
      });
      actionTaken = actionTaken === 'commented' ? 'commented' : 'reported';
    }
  }

  const result: ScanResult = {
    postId,
    score,
    barkLevel,
    timestamp: Date.now(),
    actionTaken,
  };
  await saveScanResult(redis, result);
  return result;
}

/**
 * Scan a comment for slop. Similar to scanPost but adapted for comments.
 */
async function scanComment(
  context: ContextWithRedis,
  commentId: string,
  options?: { force?: boolean },
): Promise<ScanResult | null> {
  const { redis, reddit } = context;

  if (!options?.force && (await hasBeenScanned(redis, commentId))) return null;

  let comment;
  try {
    comment = await reddit.getCommentById(commentId);
  } catch {
    return null; // Comment was deleted before we could scan it
  }
  const body = comment.body ?? '';
  const settings = await loadSettings(context);

  if (body.length < settings.minLength) return null;

  const cleaned = cleanText(body);
  const authorName = comment.authorName ?? '[deleted]';
  const authorInfo = await getAuthorInfo(reddit, authorName);
  const score = scorePost(cleaned, authorInfo, comment.score);
  const barkLevel = getBarkLevel(score.overall);

  // The parent post ID — used to enforce one bark per thread
  const parentPostId = comment.postId;

  let actionTaken: ScanResult['actionTaken'] = 'none';

  if (score.overall < settings.threshold) {
    const commentUrl = `https://www.reddit.com${comment.permalink}`;

    // Reply to the suspicious comment — only once per thread (atomic claim)
    if (settings.visibility === 'public' && barkLevel.barks > 0) {
      if (await claimBarkSlot(redis, parentPostId)) {
        const barkText = generateBarkComment(score);
        if (barkText) {
          const reply = await reddit.submitComment({
            id: commentId,
            text: barkText,
          });
          try { await reply.distinguish(true); } catch { /* missing mod perms */ }
          actionTaken = 'commented';
        }
      }
    }

    // Modmail notification
    try {
      const modMessage = generateModMessage(
        score,
        `Comment by u/${authorName}`,
        commentUrl,
        authorName,
      );
      await reddit.sendPrivateMessage({
        to: `/r/${comment.subredditName}`,
        subject: `SlopHound Alert [${barkLevel.barks}/5] — comment by u/${authorName}`,
        text: modMessage,
      });
    } catch {
      // Non-fatal
    }

    // Auto-remove or report to mod queue
    if (settings.actionMode === 'auto-remove') {
      await comment.remove(false);
      actionTaken = 'removed';
    } else {
      await reddit.report(comment, {
        reason: `SlopHound: ${barkLevel.barks}/5 barks — authenticity ${(score.overall * 100).toFixed(0)}%`,
      });
      actionTaken = actionTaken === 'commented' ? 'commented' : 'reported';
    }
  }

  const result: ScanResult = {
    postId: commentId,
    score,
    barkLevel,
    timestamp: Date.now(),
    actionTaken,
  };
  await saveScanResult(redis, result);
  return result;
}

// ---------------------------------------------------------------------------
// Triggers — automatically scan new posts and comments
// ---------------------------------------------------------------------------

/** Get the bot's own username so we never scan our own content. */
async function getAppUsername(context: ContextWithRedis): Promise<string> {
  try {
    const appUser = await context.reddit.getAppUser();
    return appUser.username;
  } catch {
    return 'ai-slop-hound'; // fallback
  }
}

Devvit.addTrigger({
  event: 'PostCreate',
  onEvent: async (event, context) => {
    const postId = event.post?.id;
    if (!postId) return;
    // Don't scan our own posts
    const appUsername = await getAppUsername(context);
    if (event.author?.name === appUsername) return;
    await scanPost(context, postId);
  },
});

Devvit.addTrigger({
  event: 'CommentCreate',
  onEvent: async (event, context) => {
    const commentId = event.comment?.id;
    if (!commentId) return;
    // Don't scan our own comments (prevents infinite loop)
    const appUsername = await getAppUsername(context);
    if (event.author?.name === appUsername) return;
    await scanComment(context, commentId);
  },
});

// ---------------------------------------------------------------------------
// Menu action — manual "sniff" on any post
// ---------------------------------------------------------------------------

Devvit.addMenuItem({
  label: 'SlopHound: Sniff This Post',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const postId = event.targetId;
    context.ui.showToast('SlopHound is sniffing...');

    const result = await scanPost(context, postId, { force: true });

    if (!result) {
      context.ui.showToast('Post is too short to scan.');
      return;
    }

    const level = result.barkLevel;
    if (level.barks === 0) {
      context.ui.showToast(
        `SlopHound says: All clear! Authenticity ${(result.score.overall * 100).toFixed(0)}% — this post smells genuine.`,
      );
    } else {
      context.ui.showToast(
        `SlopHound: ${level.barks}/5 barks! Authenticity ${(result.score.overall * 100).toFixed(0)}%. Check modmail for details.`,
      );
    }
  },
});

Devvit.addMenuItem({
  label: 'SlopHound: Sniff This Comment',
  location: 'comment',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const commentId = event.targetId;
    context.ui.showToast('SlopHound is sniffing...');

    const result = await scanComment(context, commentId, { force: true });

    if (!result) {
      context.ui.showToast('Comment is too short to scan.');
      return;
    }

    const level = result.barkLevel;
    if (level.barks === 0) {
      context.ui.showToast(
        `SlopHound says: All clear! Authenticity ${(result.score.overall * 100).toFixed(0)}% — this comment smells genuine.`,
      );
    } else {
      context.ui.showToast(
        `SlopHound: ${level.barks}/5 barks! Authenticity ${(result.score.overall * 100).toFixed(0)}%. Check modmail for details.`,
      );
    }
  },
});

export default Devvit;
