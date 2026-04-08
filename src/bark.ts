/**
 * SlopHound personality — barks at slop. That's it.
 */

import type { BarkLevel, SlopScore } from './types.js';

export function getBarkLevel(overall: number): BarkLevel {
  const slop = 1 - overall;

  if (slop < 0.3) return { barks: 0, intensity: 'none' };
  if (slop < 0.45) return { barks: 1, intensity: 'mild' };
  if (slop < 0.6) return { barks: 2, intensity: 'moderate' };
  if (slop < 0.75) return { barks: 3, intensity: 'strong' };
  if (slop < 0.9) return { barks: 4, intensity: 'severe' };
  return { barks: 5, intensity: 'definite' };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function whyItSmells(score: SlopScore): string {
  const reasons: string[] = [];
  if (score.signals.mimicry_combo) reasons.push('fake casual + clean structure');
  else if (score.signals.casual_polish_mismatch >= 0.4) reasons.push('too polished for how casual it sounds');
  if (score.signals.anecdote_structure >= 0.6) reasons.push('suspiciously perfect anecdote');
  if (score.signals.agreeability >= 0.5) reasons.push('too agreeable');
  if (score.signals.forced_casual >= 3) reasons.push('forced Reddit voice');
  if (score.signals.parallel_structure >= 1) reasons.push('parallel structure');
  if (score.signals.hedging_phrases >= 3) reasons.push('hedging phrases');
  if (score.signals.chatgpt_fingerprints >= 3) reasons.push('ChatGPT fingerprints');
  if (score.signals.paragraph_uniformity > 0.8) reasons.push('cookie-cutter paragraphs');
  if (score.emotionalVariance < 0.3) reasons.push('emotionally flat');
  if (score.paidProbability > 0.65) reasons.push('promo vibes');
  if (score.accountTrust < 0.35) reasons.push('sus account');
  if (score.signals.slop_coverage >= 6) reasons.push('buzzword overload');

  return reasons.length > 0 ? reasons.join(', ') : 'general AI vibes';
}

const BARKS: Record<number, string[]> = {
  1: ['woof.'],
  2: ['woof woof.'],
  3: ['WOOF WOOF WOOF.'],
  4: ['WOOF WOOF WOOF WOOF!'],
  5: ['AWOOOOOOOO!'],
};

const REACTIONS: Record<number, string[]> = {
  1: [
    'faint whiff of something. probably nothing... probably.',
    'nose twitch. something smells a little off here.',
    'caught a scent. could be nothing.',
  ],
  2: [
    'this smells synthetic.',
    'hackles up. something about this reads off.',
    'sniffing intensifies. this one is suspicious.',
  ],
  3: [
    'this doesn\'t smell right.',
    'digging up bones on this one. multiple signals firing.',
    'picked up several AI scents here.',
  ],
  4: [
    'multiple strong signals detected.',
    'all four paws planted. high confidence on this one.',
    'strong AI scent across the board.',
  ],
  5: [
    'every signal is firing. extremely high confidence.',
    'full howl. this one lit up the whole board.',
    'off the charts. about as confident as it gets.',
  ],
};

export function generateBarkComment(score: SlopScore): string | null {
  const level = getBarkLevel(score.overall);
  if (level.barks === 0) return null;

  const bark = pick(BARKS[level.barks]);
  const reaction = pick(REACTIONS[level.barks]);
  const why = whyItSmells(score);
  const pct = (score.overall * 100).toFixed(0);

  return [
    `**${bark}** ${reaction}`,
    '',
    `**${level.barks}/5 barks** — authenticity ${pct}% (${why})`,
    '',
    `^(SlopHound is an AI content detector for mods.) [^(Learn more)](https://developers.reddit.com/apps/ai-slop-hound)`,
  ].join('\n');
}

export function generateModMessage(
  score: SlopScore,
  postTitle: string,
  postUrl: string,
  authorName: string,
): string {
  const level = getBarkLevel(score.overall);

  return [
    `**SlopHound [${level.barks}/5]** — [${postTitle}](${postUrl}) by u/${authorName}`,
    '',
    `| | |`,
    `|---|---|`,
    `| Authenticity | ${(score.overall * 100).toFixed(0)}% |`,
    `| AI probability | ${(score.aiProbability * 100).toFixed(0)}% |`,
    `| Promo probability | ${(score.paidProbability * 100).toFixed(0)}% |`,
    `| Specificity | ${(score.specificity * 100).toFixed(0)}% |`,
    `| Emotional variance | ${(score.emotionalVariance * 100).toFixed(0)}% |`,
    `| Account trust | ${(score.accountTrust * 100).toFixed(0)}% |`,
  ].join('\n');
}
