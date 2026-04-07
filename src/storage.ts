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
  await redis.set(scanKey(result.postId), JSON.stringify(result));
  await redis.expire(scanKey(result.postId), SCAN_TTL);

  // Increment stats
  await redis.incrBy(`${statsKey()}:total_scans`, 1);
  if (result.actionTaken !== 'none') {
    await redis.incrBy(`${statsKey()}:total_alerts`, 1);
  }
}

export async function hasBeenScanned(
  redis: RedisClient,
  postId: string,
): Promise<boolean> {
  const val = await redis.get(scanKey(postId));
  return val !== undefined && val !== null;
}

export async function getScanResult(
  redis: RedisClient,
  postId: string,
): Promise<ScanResult | null> {
  const val = await redis.get(scanKey(postId));
  if (!val) return null;
  return JSON.parse(val) as ScanResult;
}

// ---------------------------------------------------------------------------
// Per-thread bark tracking — only bark once per post thread
// ---------------------------------------------------------------------------

function threadBarkKey(postId: string): string {
  return `${PREFIX}:barked_in_thread:${postId}`;
}

/** Check if SlopHound has already barked anywhere in this post's thread. */
export async function hasBarkedInThread(
  redis: RedisClient,
  postId: string,
): Promise<boolean> {
  const val = await redis.get(threadBarkKey(postId));
  return val !== undefined && val !== null;
}

/** Mark that SlopHound has barked in this post's thread. */
export async function markBarkedInThread(
  redis: RedisClient,
  postId: string,
): Promise<void> {
  await redis.set(threadBarkKey(postId), '1');
  await redis.expire(threadBarkKey(postId), SCAN_TTL);
}
