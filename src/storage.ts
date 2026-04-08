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
 * Atomically claim the bark slot for a thread. Returns true if this call
 * won the slot (i.e. no prior bark), false if another call already claimed it.
 * Uses set-if-not-exists to prevent race conditions with concurrent triggers.
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
