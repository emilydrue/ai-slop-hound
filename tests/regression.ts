/**
 * Regression gate — compares current fixture scores against the committed
 * baseline in `tests/snapshot.json`. Fails if any fixture's `overall` score
 * drifts by more than DRIFT_TOLERANCE. Prevents silent accuracy regressions
 * when scorer weights change.
 *
 * Usage:
 *   npx tsx tests/regression.ts            # compare to snapshot
 *   npx tsx tests/regression.ts --update   # rewrite snapshot from current scores
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scorePost } from '../src/scorer.js';
import { FIXTURES } from './fixtures.js';

const DRIFT_TOLERANCE = 0.05;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, 'snapshot.json');

interface Snapshot {
  scores: Record<string, { overall: number; aiProbability: number }>;
}

function currentScores(): Snapshot {
  const scores: Snapshot['scores'] = {};
  for (const f of FIXTURES) {
    const s = scorePost(f.body, f.author, f.upvotes, f.title);
    scores[f.id] = {
      overall: s.overall,
      aiProbability: s.aiProbability,
    };
  }
  return { scores };
}

function update() {
  const snap = currentScores();
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2) + '\n');
  console.log(`Wrote snapshot with ${Object.keys(snap.scores).length} fixtures.`);
}

function check() {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.error(`No snapshot at ${SNAPSHOT_PATH}. Run with --update to create one.`);
    process.exit(2);
  }
  const baseline: Snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const current = currentScores();

  const drifted: Array<{ id: string; was: number; now: number; delta: number }> = [];

  for (const id of Object.keys(current.scores)) {
    const base = baseline.scores[id];
    const cur = current.scores[id];
    if (!base) {
      drifted.push({ id, was: NaN, now: cur.overall, delta: NaN });
      continue;
    }
    const delta = cur.overall - base.overall;
    if (Math.abs(delta) > DRIFT_TOLERANCE) {
      drifted.push({ id, was: base.overall, now: cur.overall, delta });
    }
  }

  if (drifted.length === 0) {
    console.log(
      `Regression OK: all ${Object.keys(current.scores).length} fixtures within ±${DRIFT_TOLERANCE}.`,
    );
    return;
  }

  console.log('Regression drift detected:');
  for (const d of drifted) {
    const deltaStr = Number.isNaN(d.delta)
      ? 'NEW'
      : (d.delta > 0 ? '+' : '') + d.delta.toFixed(3);
    console.log(`  ${d.id}: ${d.was.toFixed(3)} -> ${d.now.toFixed(3)}  (${deltaStr})`);
  }
  console.log('');
  console.log(
    'If this drift is expected and the scores still match the labels, re-run with --update.',
  );
  process.exit(1);
}

const mode = process.argv.includes('--update') ? 'update' : 'check';
if (mode === 'update') update();
else check();
