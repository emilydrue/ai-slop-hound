/**
 * Redis storage helpers for scan history and stats.
 */

import type { RedisClient } from '@devvit/public-api';
import type { ScanResult } from './types.js';

const PREFIX = 'slophound';
const SCAN_TTL = 60 * 60 * 24 * 7; // 7 days

function scanKey(postId: string): string {
  return `${PREFIX}:scan:${postId}`;
}

function statsKey(): string {
  return `${PREFIX}:stats`;
}

export async function saveScanResult(
  redis: RedisClient,
  result: ScanResult,
): Promise<void> {
  const key = scanKey(result.postId);
  await redis.set(key, JSON.stringify(result));
  const promises: Promise<unknown>[] = [
    redis.expire(key, SCAN_TTL),
    redis.incrBy(`${statsKey()}:total_scans`, 1),
  ];
  if (result.actionTaken !== 'none') {
    promises.push(redis.incrBy(`${statsKey()}:total_alerts`, 1));
  }
  await Promise.all(promises);
}

export async function deleteScanResult(
  redis: RedisClient,
  contentId: string,
): Promise<void> {
  await redis.del(scanKey(contentId));
}

export async function hasBeenScanned(
  redis: RedisClient,
  postId: string,
): Promise<boolean> {
  const val = await redis.get(scanKey(postId));
  return val !== undefined && val !== null;
}

// ---------------------------------------------------------------------------
// Per-thread bark tracking — only bark once per post thread
// ---------------------------------------------------------------------------

function threadBarkKey(postId: string): string {
  return `${PREFIX}:barked_in_thread:${postId}`;
}

/**
 * Claim the bark slot for a thread. Returns true if this call
 * won the slot (i.e. no prior bark), false if another call already claimed it.
 * Note: not fully atomic — small race window between get and set.
 */
export async function claimBarkSlot(
  redis: RedisClient,
  postId: string,
): Promise<boolean> {
  const key = threadBarkKey(postId);
  const existing = await redis.get(key);
  if (existing !== undefined && existing !== null) return false;
  await redis.set(key, '1');
  await redis.expire(key, SCAN_TTL);
  return true;
}

// ---------------------------------------------------------------------------
// Trusted users allowlist
// ---------------------------------------------------------------------------

function trustedSetKey(): string {
  return `${PREFIX}:trusted_users`;
}

export async function isUserTrusted(
  redis: RedisClient,
  username: string,
): Promise<boolean> {
  const score = await redis.zScore(trustedSetKey(), username.toLowerCase());
  return score !== undefined && score !== null;
}

export async function trustUser(
  redis: RedisClient,
  username: string,
): Promise<void> {
  await redis.zAdd(trustedSetKey(), { member: username.toLowerCase(), score: Date.now() });
}

export async function untrustUser(
  redis: RedisClient,
  username: string,
): Promise<void> {
  await redis.zRem(trustedSetKey(), [username.toLowerCase()]);
}

export async function getTrustedUsers(
  redis: RedisClient,
): Promise<string[]> {
  const results = await redis.zRange(trustedSetKey(), 0, -1, { by: 'rank' });
  return results.map((r) => r.member);
}

// ---------------------------------------------------------------------------
// False positive log — stored for analysis, no TTL
// ---------------------------------------------------------------------------

function fpLogKey(): string {
  return `${PREFIX}:false_positives`;
}

export async function logFalsePositive(
  redis: RedisClient,
  contentId: string,
  authorName: string,
  modName: string,
): Promise<void> {
  const entry = JSON.stringify({
    contentId,
    authorName,
    modName,
    timestamp: Date.now(),
  });
  await redis.zAdd(fpLogKey(), { member: entry, score: Date.now() });
  await redis.incrBy(`${statsKey()}:false_positives`, 1);
}

/** Retrieve recent false positives for future dashboard/analysis features. */
export async function getFalsePositives(
  redis: RedisClient,
  limit: number = 50,
): Promise<string[]> {
  const results = await redis.zRange(fpLogKey(), 0, limit - 1, { reverse: true, by: 'rank' });
  return results.map((r) => r.member);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getStats(
  redis: RedisClient,
): Promise<{ totalScans: number; totalAlerts: number; falsePositives: number }> {
  const [scans, alerts, fps] = await Promise.all([
    redis.get(`${statsKey()}:total_scans`),
    redis.get(`${statsKey()}:total_alerts`),
    redis.get(`${statsKey()}:false_positives`),
  ]);
  return {
    totalScans: parseInt(scans ?? '0', 10),
    totalAlerts: parseInt(alerts ?? '0', 10),
    falsePositives: parseInt(fps ?? '0', 10),
  };
}
