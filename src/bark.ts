/**
 * SlopHound personality — barks at slop. That's it.
 */

import type { BarkLevel, SlopScore } from './types.js';

export function getBarkLevel(overall: number): BarkLevel {
  const slop = 1 - overall;

  if (slop < 0.3) return { barks: 0, intensity: 'none' };
  if (slop < 0.4) return { barks: 1, intensity: 'mild' };
  if (slop < 0.5) return { barks: 2, intensity: 'moderate' };
  if (slop < 0.6) return { barks: 3, intensity: 'strong' };
  if (slop < 0.75) return { barks: 4, intensity: 'severe' };
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

const REACTION = 'smells like AI.';

export function generateBarkComment(score: SlopScore): string | null {
  const level = getBarkLevel(score.overall);
  if (level.barks === 0) return null;

  const bark = pick(BARKS[level.barks]);
  const reaction = REACTION;

  return [
    `**${bark}** ${reaction}`,
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
    `This content triggered SlopHound's AI detection system.`,
  ].join('\n');
}
