/**
 * Statistical authenticity scorer with Reddit-specific signals
 * for detecting well-prompted AI content.
 *
 * Pure computation, no external API calls. Runs in milliseconds.
 */

import type { AuthorInfo, SlopScore } from './types.js';
import {
  HEDGING_PATTERNS,
  CHATGPT_FINGERPRINTS,
  SLOP_COVERAGE_WORDS,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  CONTRAST_WORDS,
  COMPARISON_MARKERS,
  PROBLEM_MARKERS,
  FORCED_CASUAL_MARKERS,
  ANECDOTE_OPENERS,
  ANECDOTE_TRANSITIONS,
  PARAGRAPH_TOPIC_STARTERS,
  PARALLEL_STRUCTURE,
  WEIGHTS,
} from './constants.js';

const clamp = (v: number): number => Math.max(0, Math.min(1, v));

/** Lexical diversity: unique words / total words. */
function typeTokenRatio(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g);
  if (!words || words.length === 0) return 0;
  return new Set(words).size / words.length;
}

/** Count AI-typical hedging phrases. */
function countHedgingPhrases(text: string): number {
  return HEDGING_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0,
  );
}

/** Count ChatGPT fingerprint phrases. */
function countChatgptFingerprints(text: string): number {
  const lower = text.toLowerCase();
  return CHATGPT_FINGERPRINTS.reduce(
    (count, phrase) => count + (lower.includes(phrase) ? 1 : 0),
    0,
  );
}

/** How uniform are paragraph lengths? High = suspicious. */
function paragraphUniformity(text: string): number {
  const paragraphs = text
    .split(/\n\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length < 2) return 0;

  const lengths = paragraphs.map((p) => p.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return 0;

  const variance =
    lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, 1 - cv / 0.8);
}

/** How specific is the text? Real humans mention concrete details. */
function specificityScore(text: string): number {
  let score = 0.5;
  const lower = text.toLowerCase();

  const numberCount = (text.match(/\b\d+\b/g) || []).length;
  if (numberCount >= 3) score += 0.15;
  else if (numberCount >= 1) score += 0.05;

  const timeRefs = (lower.match(/\b\d+\s*(month|year|week|day|hour)s?\b/g) || []).length;
  if (timeRefs >= 1) score += 0.15;

  if (COMPARISON_MARKERS.some((m) => lower.includes(m))) score += 0.1;

  const problemCount = PROBLEM_MARKERS.reduce(
    (c, m) => c + (lower.includes(m) ? 1 : 0),
    0,
  );
  if (problemCount >= 2) score += 0.15;
  else if (problemCount === 1) score += 0.05;

  return Math.min(1, score);
}

/** Mixed emotions = more authentic. Uniformly positive/negative = suspicious. */
function emotionalVariance(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let posCount = 0;
  let negCount = 0;
  let hasContrast = false;

  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) posCount++;
    if (NEGATIVE_WORDS.has(w)) negCount++;
    if (CONTRAST_WORDS.has(w)) hasContrast = true;
  }

  if (posCount > 0 && negCount > 0) return 0.8;
  if (hasContrast && (posCount > 0 || negCount > 0)) return 0.65;
  if (posCount > 3 && negCount === 0) return 0.2;
  if (negCount > 3 && posCount === 0) return 0.3;
  return 0.5;
}

// -----------------------------------------------------------------------
// NEW: Reddit voice mimicry detection
// -----------------------------------------------------------------------

/**
 * Count forced-casual markers (lmao, lol, ngl, literally, etc).
 * Individually normal, but AI stacks them to sound human.
 */
function countForcedCasual(text: string): number {
  const lower = text.toLowerCase();
  return FORCED_CASUAL_MARKERS.reduce(
    (c, m) => c + (lower.includes(m) ? 1 : 0),
    0,
  );
}

/**
 * Detect "Reddit anecdote" structure:
 * - Opens with agreement/validation ("thisssss", "can confirm", "honestly")
 * - Has a too-perfect anecdote with specific details
 * - Adds exactly one extra point ("the one thing i'd add")
 *
 * Returns 0-1 where higher = more suspicious.
 */
function anecdoteStructureScore(text: string): number {
  let score = 0;

  // Check for Reddit-style opener
  const hasOpener = ANECDOTE_OPENERS.some((p) => p.test(text));
  if (hasOpener) score += 0.3;

  // Check for smooth transitions between points
  const transitionCount = ANECDOTE_TRANSITIONS.reduce(
    (c, p) => c + (p.test(text) ? 1 : 0),
    0,
  );
  score += Math.min(0.4, transitionCount * 0.2);

  // Check if paragraphs each start with a topic-shift word
  const paragraphs = text.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= 3) {
    const topicStarts = paragraphs.slice(1).filter((p) =>
      PARAGRAPH_TOPIC_STARTERS.some((pat) => pat.test(p)),
    );
    // If most non-first paragraphs start with topic words, suspicious
    if (topicStarts.length >= paragraphs.length - 2) {
      score += 0.3;
    }
  }

  return Math.min(1, score);
}

/**
 * Detect the mismatch between casual tone and polished structure.
 * Real casual writers don't produce perfectly organized multi-paragraph
 * comments with clean topic sentences.
 *
 * Returns 0-1 where higher = more suspicious.
 */
function casualPolishMismatch(text: string): number {
  const lower = text.toLowerCase();

  // Casual indicators
  const casualCount = countForcedCasual(text);
  const hasNoCapitals = text === text.toLowerCase();
  const hasElongation = /(.)\1{2,}/.test(text); // "thisssss", "sooo"
  const casualScore = Math.min(1, (casualCount * 0.15) + (hasNoCapitals ? 0.2 : 0) + (hasElongation ? 0.15 : 0));

  // Polish indicators (structure that's too clean for casual writing)
  const paragraphs = text.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  const multiParagraph = paragraphs.length >= 3;
  const hasTopicSentences = paragraphs.length >= 2 && paragraphs.slice(1).some((p) =>
    PARAGRAPH_TOPIC_STARTERS.some((pat) => pat.test(p)),
  );
  // Sentences per paragraph are balanced (AI writes even-length blocks)
  const sentenceCounts = paragraphs.map((p) => (p.match(/[.!?]+/g) || []).length);
  const avgSentences = sentenceCounts.reduce((a, b) => a + b, 0) / Math.max(sentenceCounts.length, 1);
  const evenSentences = avgSentences > 1 && sentenceCounts.every((c) => Math.abs(c - avgSentences) <= 1.5);

  const polishScore = Math.min(1,
    (multiParagraph ? 0.3 : 0) +
    (hasTopicSentences ? 0.3 : 0) +
    (evenSentences ? 0.2 : 0),
  );

  // Mismatch = both casual AND polished
  if (casualScore >= 0.3 && polishScore >= 0.3) {
    return (casualScore + polishScore) / 2;
  }
  return 0;
}

/**
 * Detect "too agreeable" pattern — AI comments on Reddit almost always
 * start by validating the OP, then add supporting content. Real humans
 * are messier: they disagree, go off-topic, or skip the validation.
 */
function agreeabilityScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Validation openers
  const validationPatterns = [
    /^this+s*[.!]?\s/im,
    /\bso underrated\b/i,
    /\blife.?changing\b/i,
    /\bgenuinely .{0,20}(advice|tip|help)/i,
    /\bcan confirm\b/i,
    /\bhard agree\b/i,
    /\bcame here to say\b/i,
    /\b100%\s*(this|agree|correct)\b/i,
  ];
  const validationCount = validationPatterns.reduce(
    (c, p) => c + (p.test(lower) ? 1 : 0),
    0,
  );
  score += Math.min(0.4, validationCount * 0.15);

  // "I'd add" / "the one thing" — AI loves to agree then contribute
  if (/\b(i'?d add|i'?d say|i'?ll add)\b/i.test(lower)) score += 0.2;

  // Multiple paragraphs that all support the same thesis (no disagreement)
  const paragraphs = text.split(/\n\n/).filter((p) => p.trim());
  if (paragraphs.length >= 3) {
    const hasAnyDisagreement = /\b(disagree|wrong|no offense but|not really|actually.*not)\b/i.test(lower);
    if (!hasAnyDisagreement) score += 0.15;
  }

  return Math.min(1, score);
}

// -----------------------------------------------------------------------
// Main scoring function
// -----------------------------------------------------------------------

export function scorePost(
  text: string,
  author?: AuthorInfo | null,
  upvotes?: number | null,
): SlopScore {
  const signals: Record<string, number> = {};

  // --- AI-generated probability ---
  let aiProb = 0.5;

  const ttr = typeTokenRatio(text);
  signals.type_token_ratio = ttr;
  if (ttr < 0.3) aiProb += 0.1;
  else if (ttr > 0.7) aiProb -= 0.1;

  const hedgingCount = countHedgingPhrases(text);
  signals.hedging_phrases = hedgingCount;
  if (hedgingCount >= 3) aiProb += 0.15;
  else if (hedgingCount === 0) aiProb -= 0.05;

  const paraUniformity = paragraphUniformity(text);
  signals.paragraph_uniformity = paraUniformity;
  if (paraUniformity > 0.8) aiProb += 0.1;

  const fingerprintCount = countChatgptFingerprints(text);
  signals.chatgpt_fingerprints = fingerprintCount;
  if (fingerprintCount >= 4) aiProb += 0.25;
  else if (fingerprintCount >= 3) aiProb += 0.15;

  // NEW: Reddit voice mimicry signals
  const forcedCasualCount = countForcedCasual(text);
  signals.forced_casual = forcedCasualCount;

  const anecdote = anecdoteStructureScore(text);
  signals.anecdote_structure = anecdote;
  if (anecdote >= 0.6) aiProb += 0.2;
  else if (anecdote >= 0.3) aiProb += 0.1;

  const mismatch = casualPolishMismatch(text);
  signals.casual_polish_mismatch = mismatch;
  if (mismatch >= 0.4) aiProb += 0.2;
  else if (mismatch >= 0.2) aiProb += 0.1;

  const agreeable = agreeabilityScore(text);
  signals.agreeability = agreeable;
  if (agreeable >= 0.5) aiProb += 0.15;
  else if (agreeable >= 0.3) aiProb += 0.08;

  // Parallel structure ("it's X, it's Y")
  const parallelCount = PARALLEL_STRUCTURE.reduce(
    (c, p) => c + (p.test(text) ? 1 : 0),
    0,
  );
  signals.parallel_structure = parallelCount;
  if (parallelCount >= 2) aiProb += 0.2;
  else if (parallelCount >= 1) aiProb += 0.1;

  // Combo bonus: forced-casual + clean structure = strong AI signal
  if (forcedCasualCount >= 3 && anecdote >= 0.3) {
    aiProb += 0.15;
    signals.mimicry_combo = 1;
  }

  // --- Paid/promotional probability ---
  let paidProb = 0.5;

  const exclamationDensity = text.split('!').length - 1;
  const exclRatio = exclamationDensity / Math.max(text.length, 1);
  signals.exclamation_density = exclRatio;
  if (exclRatio > 0.03) paidProb += 0.15;

  const lower = text.toLowerCase();
  const coverageCount = SLOP_COVERAGE_WORDS.reduce(
    (c, w) => c + (lower.includes(w) ? 1 : 0),
    0,
  );
  signals.slop_coverage = coverageCount;
  if (coverageCount >= 6) paidProb += 0.2;

  // --- Specificity ---
  let specificity = specificityScore(text);
  signals.specificity_raw = specificity;

  const wordCount = (text.match(/\S+/g) || []).length;
  signals.word_count = wordCount;
  if (wordCount < 10) specificity -= 0.2;
  else if (wordCount > 30) specificity += 0.1;

  // --- Emotional variance ---
  const emotVar = emotionalVariance(text);
  signals.emotional_variance_raw = emotVar;

  // --- Account trust ---
  let accountTrust = 0.5;
  if (author) {
    if (author.accountAgeDays != null) {
      signals.account_age_days = author.accountAgeDays;
      if (author.accountAgeDays < 30) accountTrust -= 0.2;
      else if (author.accountAgeDays > 365) accountTrust += 0.15;
    }
    if (author.karma != null) {
      signals.karma = author.karma;
      if (author.karma < 100) accountTrust -= 0.15;
      else if (author.karma > 5000) accountTrust += 0.1;
    }
  }

  if (upvotes != null) {
    signals.upvotes = upvotes;
    if (upvotes > 10) accountTrust += 0.05;
    else if (upvotes < -2) accountTrust -= 0.1;
  }

  // --- Clamp and compute overall ---
  aiProb = clamp(aiProb);
  paidProb = clamp(paidProb);
  specificity = clamp(specificity);
  accountTrust = clamp(accountTrust);

  const overall = clamp(
    (1 - aiProb) * WEIGHTS.ai +
      (1 - paidProb) * WEIGHTS.paid +
      specificity * WEIGHTS.specificity +
      emotVar * WEIGHTS.emotionalVariance +
      accountTrust * WEIGHTS.accountTrust,
  );

  return {
    overall: Math.round(overall * 1000) / 1000,
    aiProbability: Math.round(aiProb * 1000) / 1000,
    paidProbability: Math.round(paidProb * 1000) / 1000,
    specificity: Math.round(specificity * 1000) / 1000,
    emotionalVariance: Math.round(emotVar * 1000) / 1000,
    accountTrust: Math.round(accountTrust * 1000) / 1000,
    signals,
  };
}
