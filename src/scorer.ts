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
  EMPTY_INTENSIFIERS,
  DRAMATIC_PATTERNS,
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
  // Start at 0.3 (mild presumption of innocence) and accumulate evidence.
  // Every signal contributes proportionally — no minimum threshold to matter.
  let aiProb = 0.3;

  const ttr = typeTokenRatio(text);
  signals.type_token_ratio = ttr;
  // Low diversity = repetitive/formulaic. High = authentic vocabulary.
  aiProb += (1 - ttr) * 0.08;

  const hedgingCount = countHedgingPhrases(text);
  signals.hedging_phrases = hedgingCount;
  // Each hedging phrase contributes — don't wait for 3+
  aiProb += hedgingCount * 0.05;

  const paraUniformity = paragraphUniformity(text);
  signals.paragraph_uniformity = paraUniformity;
  // Scales continuously rather than gating at 0.8
  aiProb += paraUniformity * 0.1;

  const fingerprintCount = countChatgptFingerprints(text);
  signals.chatgpt_fingerprints = fingerprintCount;
  // Each fingerprint is a strong signal — even 1 matters
  aiProb += fingerprintCount * 0.06;

  // Reddit voice mimicry signals
  const forcedCasualCount = countForcedCasual(text);
  signals.forced_casual = forcedCasualCount;

  const anecdote = anecdoteStructureScore(text);
  signals.anecdote_structure = anecdote;
  aiProb += anecdote * 0.15;

  const mismatch = casualPolishMismatch(text);
  signals.casual_polish_mismatch = mismatch;
  aiProb += mismatch * 0.15;

  const agreeable = agreeabilityScore(text);
  signals.agreeability = agreeable;
  aiProb += agreeable * 0.12;

  // Parallel structure — rhetorical patterns real people rarely use
  const parallelCount = PARALLEL_STRUCTURE.reduce(
    (c, p) => c + (p.test(text) ? 1 : 0),
    0,
  );
  signals.parallel_structure = parallelCount;
  // Each match is a strong tell — scales with count
  aiProb += parallelCount * 0.12;

  // Combo: forced-casual + clean structure = prompted AI mimicking Reddit
  if (forcedCasualCount >= 3 && anecdote >= 0.3) {
    aiProb += 0.15;
    signals.mimicry_combo = 1;
  }

  // Em dash overuse — AI uses ~10x more em dashes than humans (GPT-4 training artifact)
  const emDashCount = (text.match(/—|--/g) || []).length;
  signals.em_dashes = emDashCount;
  aiProb += Math.min(0.15, emDashCount * 0.04);

  // Empty intensifiers — "absolutely brilliant", "truly groundbreaking"
  const intensifierCount = EMPTY_INTENSIFIERS.reduce(
    (c, p) => c + (p.test(text) ? 1 : 0),
    0,
  );
  signals.empty_intensifiers = intensifierCount;
  aiProb += intensifierCount * 0.04;

  // Dramatic rhetorical patterns — "Something shifted.", "But now?"
  const dramaticCount = DRAMATIC_PATTERNS.reduce(
    (c, p) => c + (p.test(text) ? 1 : 0),
    0,
  );
  signals.dramatic_patterns = dramaticCount;
  aiProb += dramaticCount * 0.06;

  // Contraction avoidance — AI tends to write "it is", "do not", "I am"
  // where humans write "it's", "don't", "I'm"
  const wordCount = (text.match(/\S+/g) || []).length;
  if (wordCount > 100) {
    const formalCount = (text.match(/\b(it is|do not|does not|can not|will not|would not|should not|I am|I have|I would|I will)\b/g) || []).length;
    const contractionCount = (text.match(/\b(it's|don't|doesn't|can't|won't|wouldn't|shouldn't|i'm|i've|i'd|i'll)\b/ig) || []).length;
    const total = formalCount + contractionCount;
    if (total >= 3) {
      const formalRatio = formalCount / total;
      signals.contraction_avoidance = formalRatio;
      // Humans almost always use contractions on Reddit; high formal ratio = suspicious
      if (formalRatio > 0.5) aiProb += 0.08;
      else if (formalRatio > 0.3) aiProb += 0.04;
    }
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

  // Count structural AI tells — rhetorical patterns that indicate the post
  // was crafted by a model even if it has specific details (prompted AI).
  // Only count patterns that real humans genuinely don't produce.
  const structuralTells =
    (parallelCount >= 1 ? 1 : 0) +           // tricolons, antithetical pairs
    (anecdote >= 0.6 ? 1 : 0) +              // suspiciously perfect anecdote structure
    (paraUniformity > 0.85 ? 1 : 0) +        // cookie-cutter paragraph lengths
    (hedgingCount >= 3 ? 1 : 0) +            // heavy hedging
    (fingerprintCount >= 2 ? 1 : 0);         // multiple ChatGPT fingerprints
  signals.structural_tells = structuralTells;

  // When structural AI patterns are present, specificity should NOT rescue
  // the score — prompted AI has specificity too. Degrade specificity weight
  // proportionally to how many structural tells fired.
  const specificityDampen = Math.max(0, 1 - structuralTells * 0.3);
  signals.specificity_dampen = specificityDampen;

  const overall = clamp(
    (1 - aiProb) * WEIGHTS.ai +
      (1 - paidProb) * WEIGHTS.paid +
      specificity * WEIGHTS.specificity * specificityDampen +
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
