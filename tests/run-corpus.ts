/**
 * Corpus runner — scores every fixture, prints a results table, and computes
 * label accuracy. Exits non-zero if any strict-labeled fixture (ai/human)
 * lands on the wrong side of its acceptance band.
 *
 * Usage: npx tsx tests/run-corpus.ts
 *        npx tsx tests/run-corpus.ts --json     (machine-readable)
 */

import { scorePost } from '../src/scorer.js';
import { getBarkLevel } from '../src/bark.js';
import { FIXTURES, type Fixture } from './fixtures.js';

// Acceptance bands. The scorer's default product threshold is 0.45 (anything
// below triggers an alert). We assert a small buffer on each side so the gate
// catches label inversions before they reach users.
const AI_OVERALL_MAX = 0.50;   // ai fixtures must read as alert-worthy
const HUMAN_OVERALL_MIN = 0.50; // human fixtures must read as non-alert

interface Row {
  id: string;
  label: Fixture['label'];
  overall: number;
  aiProb: number;
  humanTexture: number;
  emotVar: number;
  barks: number;
  passed: boolean | null; // null for edge fixtures
}

function run(): { rows: Row[]; failures: Row[] } {
  const rows: Row[] = [];

  for (const f of FIXTURES) {
    const score = scorePost(f.body, f.author, f.upvotes, f.title);
    const bark = getBarkLevel(score.overall);

    let passed: boolean | null = null;
    if (f.label === 'ai') passed = score.overall <= AI_OVERALL_MAX;
    else if (f.label === 'human') passed = score.overall >= HUMAN_OVERALL_MIN;

    rows.push({
      id: f.id,
      label: f.label,
      overall: score.overall,
      aiProb: score.aiProbability,
      humanTexture:
        typeof score.signals.human_markers === 'number'
          ? Number(score.signals.human_markers.toFixed(3))
          : 0,
      emotVar: score.emotionalVariance,
      barks: bark.barks,
      passed,
    });
  }

  const failures = rows.filter((r) => r.passed === false);
  return { rows, failures };
}

function printTable(rows: Row[]) {
  const header = ['id', 'label', 'overall', 'ai_prob', 'emot_var', 'barks', 'pass'];
  const lines = rows.map((r) => [
    r.id.padEnd(26),
    r.label.padEnd(6),
    r.overall.toFixed(3),
    r.aiProb.toFixed(3),
    r.emotVar.toFixed(3),
    String(r.barks),
    r.passed === null ? '—' : r.passed ? 'OK' : 'FAIL',
  ]);

  console.log(header.map((h, i) => h.padEnd([26, 6, 8, 8, 8, 5, 5][i])).join(' '));
  console.log('-'.repeat(70));
  for (const row of lines) {
    console.log(
      row
        .map((c, i) => c.padEnd([26, 6, 8, 8, 8, 5, 5][i]))
        .join(' '),
    );
  }
}

function main() {
  const jsonMode = process.argv.includes('--json');
  const { rows, failures } = run();

  if (jsonMode) {
    console.log(JSON.stringify({ rows, failureCount: failures.length }, null, 2));
  } else {
    printTable(rows);
    const strict = rows.filter((r) => r.passed !== null);
    const passed = strict.filter((r) => r.passed).length;
    console.log('');
    console.log(
      `Strict fixtures: ${passed}/${strict.length} passed. ` +
        `Edge fixtures: ${rows.length - strict.length} (record-only).`,
    );
    if (failures.length > 0) {
      console.log('');
      console.log('FAILURES:');
      for (const f of failures) {
        const bound = f.label === 'ai' ? `<= ${AI_OVERALL_MAX}` : `>= ${HUMAN_OVERALL_MIN}`;
        console.log(`  ${f.id}: overall=${f.overall.toFixed(3)} expected ${bound}`);
      }
    }
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main();
