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
  ENGAGEMENT_BAIT,
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
  // No emotional words at all in a long post = suspiciously neutral
  const totalWords = words.length;
  if (totalWords > 150 && posCount === 0 && negCount === 0) return 0.25;
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

/**
 * Perfect grammar score — real Redditors make typos, skip apostrophes,
 * don't capitalize consistently. AI produces clean, consistent prose.
 * Returns 0-1 where higher = more suspiciously polished.
 */
function prosePolishScore(text: string): number {
  let score = 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  if (sentences.length < 3) return 0;
  // Short posts can be polished without being AI — only flag longer ones
  const totalWords = text.split(/\s+/).length;
  if (totalWords < 120) return 0;

  // Consistent sentence capitalization — every sentence starts with a capital
  const capitalizedSentences = sentences.filter((s) => /^\s*[A-Z]/.test(s));
  const capRatio = capitalizedSentences.length / sentences.length;
  if (capRatio > 0.9) score += 0.3;

  // No typos / perfect punctuation — check for apostrophe usage
  // Real Redditors write "dont", "im", "thats". AI writes "don't", "I'm", "that's".
  const hasApostrophes = /\b(don't|won't|can't|shouldn't|wouldn't|couldn't|I'm|I've|I'd|I'll|it's|that's|there's|what's|let's)\b/.test(text);
  const hasCasualMissing = /\b(dont|wont|cant|shouldnt|wouldnt|couldnt|im|ive|id|ill|its|thats|theres|whats|lets)\b/i.test(text);
  if (hasApostrophes && !hasCasualMissing) score += 0.2;

  // Sentence length consistency — AI writes uniform-length sentences
  const sentenceLengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  if (mean > 0) {
    const variance = sentenceLengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / sentenceLengths.length;
    const cv = Math.sqrt(variance) / mean;
    // Low coefficient of variation = uniform sentence lengths = suspicious
    if (cv < 0.4) score += 0.25;
    else if (cv < 0.6) score += 0.1;
  }

  // No sentence fragments — real Reddit posts have fragments ("Kind of weird.", "Same here.")
  // AI almost always writes complete sentences
  const fragments = sentences.filter((s) => s.trim().split(/\s+/).length <= 3);
  if (fragments.length === 0 && sentences.length >= 5) score += 0.15;

  return Math.min(1, score);
}

/**
 * Casual bookending — AI opens and closes with casual/slangy sentences
 * but writes polished prose in the middle. Real humans are messy throughout.
 * Returns 0-1 where higher = more suspicious.
 */
function casualBookendScore(text: string): number {
  const paragraphs = text.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length < 3) return 0;

  const first = paragraphs[0];
  const last = paragraphs[paragraphs.length - 1];
  const middle = paragraphs.slice(1, -1);

  // Check if first/last are casual (short, lowercase start, fragments, questions)
  const isCasual = (p: string): boolean => {
    const words = p.split(/\s+/).length;
    const startsLower = /^[a-z]/.test(p);
    const isQuestion = /\?$/.test(p.trim());
    const isShort = words < 20;
    const hasSlang = /\b(lol|tbh|ngl|honestly|kinda|kind of|idk|weird)\b/i.test(p);
    return (isShort && (startsLower || isQuestion || hasSlang)) || (hasSlang && isQuestion);
  };

  // Check if middle paragraphs are polished (proper capitalization, longer, complete sentences)
  const isPolished = (p: string): boolean => {
    const startsUpper = /^[A-Z]/.test(p);
    const words = p.split(/\s+/).length;
    return startsUpper && words > 15;
  };

  const firstCasual = isCasual(first);
  const lastCasual = isCasual(last);
  const middlePolished = middle.filter(isPolished).length / Math.max(middle.length, 1);

  if (firstCasual && lastCasual && middlePolished > 0.6) return 0.8;
  if ((firstCasual || lastCasual) && middlePolished > 0.6) return 0.5;
  return 0;
}

/**
 * Detect advice/opinion posts with no first-person experience.
 * AI gives abstract advice. Humans say "I did X, Y happened."
 * Returns 0-1 where higher = more suspicious.
 */
function abstractAdviceScore(text: string): number {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 80) return 0;

  // Does the post give advice or opinions?
  const isAdvicePost =
    /\byou (can|should|need|could|might|have to)\b/i.test(text) ||
    /\bif you'?re\b/i.test(text) ||
    /\bmost people\b/i.test(text) ||
    /\bthe (key|secret|trick|problem|issue) is\b/i.test(text) ||
    /\bhere'?s (the thing|what|why|how)\b/i.test(text);

  if (!isAdvicePost) return 0;

  // Check for concrete first-person experience
  const hasConcreteExperience =
    /\bi (worked|built|made|started|quit|left|moved|switched|bought|sold|lost|found|tried|failed|learned|realized|discovered)\b/i.test(text) &&
    /\b(last|ago|\d{4}|month|year|week|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text);

  // Check for specific details in first-person context
  const hasSpecificFirstPerson =
    /\bmy (boss|manager|coworker|wife|husband|partner|friend|dad|mom|company|team|job|client)\b/i.test(text) ||
    /\bat (my|the) (job|company|office|work|school)\b/i.test(text) ||
    /\bwhen i was\b/i.test(text);

  if (hasConcreteExperience || hasSpecificFirstPerson) return 0;

  // Advice post with no concrete first-person experience = suspicious
  // Check how abstract it is
  const abstractMarkers = [
    /\bin general\b/i,
    /\bthe reality is\b/i,
    /\bwhat .{3,20} (don'?t|won'?t|can'?t) (realize|understand|see)\b/i,
    /\b(people|everyone|most|nobody) (think|believe|overlook|miss|forget|ignore)\b/i,
    /\bthe (real|biggest|main) (problem|issue|challenge|mistake)\b/i,
  ];
  const abstractCount = abstractMarkers.reduce((c, p) => c + (p.test(text) ? 1 : 0), 0);

  let score = 0.3; // base penalty for advice without experience
  score += abstractCount * 0.15;
  return Math.min(1, score);
}

/**
 * Essay structure detection — AI writes clean paragraphs where each
 * makes exactly one point. Real Reddit posts ramble, go off-topic,
 * have uneven paragraph lengths, and don't follow essay structure.
 * Returns 0-1 where higher = more suspicious.
 */
function essayStructureScore(text: string): number {
  const paragraphs = text.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length < 3) return 0;

  let score = 0;

  // Each paragraph starts with a clean topic/transition sentence
  const topicStarters = /^(but |so |and |another |what |the |this |for |however|meanwhile|that|in |it |because|where|already|every|napoleon|both)/i;
  const startsWithTopic = paragraphs.filter((p) => topicStarters.test(p)).length;
  const topicRatio = startsWithTopic / paragraphs.length;
  if (topicRatio > 0.7) score += 0.3;

  // Paragraphs are similar length (AI writes even blocks)
  const paraLengths = paragraphs.map((p) => p.split(/\s+/).length);
  const mean = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
  if (mean > 0) {
    const variance = paraLengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / paraLengths.length;
    const cv = Math.sqrt(variance) / mean;
    // Very low CV = suspiciously uniform
    if (cv < 0.35 && paragraphs.length >= 4) score += 0.25;
  }

  // No tangents — every paragraph stays on theme (hard to detect directly,
  // but we can check if paragraphs are independent/self-contained)
  // Proxy: check if paragraphs each have their own conclusion/transition
  const selfContained = paragraphs.filter((p) => {
    const sentences = p.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    return sentences.length >= 2 && sentences.length <= 5;
  }).length;
  const selfContainedRatio = selfContained / paragraphs.length;
  if (selfContainedRatio > 0.7 && paragraphs.length >= 4) score += 0.2;

  return Math.min(1, score);
}

// -----------------------------------------------------------------------
// Title scoring
// -----------------------------------------------------------------------

const CLICKBAIT_TITLE_PATTERNS: RegExp[] = [
  /\bwhy everyone\b/i,
  /\band you should too\b/i,
  /\bhere'?s (why|what|how)\b/i,
  /\byou need to know\b/i,
  /\bnobody is talking about\b/i,
  /\bwhat they don'?t tell you\b/i,
  /\bthe truth about\b/i,
  /\bstop doing this\b/i,
  /\bi was wrong about\b/i,
  /\bchanged (my|everything)\b/i,
  /\bwhat .{3,20} taught me\b/i,
  /\bbefore it'?s too late\b/i,
  /\bmost people (don'?t|under|over|miss|ignore)\b/i,
  /\bthe secret to\b/i,
  /\bwhat i wish i knew\b/i,
  /\bunpopular opinion\b/i,
  /\bhot take\b/i,
  /\bam i the only one\b/i,
  /\blet'?s (debate|discuss|talk about) this\b/i,
  /\bgame.?changer\b/i,
];

/**
 * Score a title for AI clickbait patterns.
 * Returns 0-1 where higher = more suspicious.
 */
function titleRedFlagScore(title: string): number {
  if (!title || title.length < 10) return 0;

  let score = 0;
  const matchCount = CLICKBAIT_TITLE_PATTERNS.reduce(
    (c, p) => c + (p.test(title) ? 1 : 0),
    0,
  );
  score += matchCount * 0.15;

  // Title uses em dash
  if (/—/.test(title)) score += 0.15;

  // Title in "X: Y" format (common AI structure)
  if (/^[^:]{5,30}:\s/.test(title)) score += 0.05;

  // Parenthetical in title — "(And Why You Should Care)"
  if (/\(.{5,30}\)/.test(title)) score += 0.15;

  return Math.min(1, score);
}

// -----------------------------------------------------------------------
// Main scoring function
// -----------------------------------------------------------------------

export function scorePost(
  text: string,
  author?: AuthorInfo | null,
  upvotes?: number | null,
  title?: string | null,
): SlopScore {
  const signals: Record<string, number> = {};
  const wordCount = (text.match(/\S+/g) || []).length;

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

  // Engagement bait — fake vulnerability + CTA + grateful edit
  const engagementCount = ENGAGEMENT_BAIT.reduce(
    (c, p) => c + (p.test(text) ? 1 : 0),
    0,
  );
  signals.engagement_bait = engagementCount;
  aiProb += engagementCount * 0.05;

  // --- Human authenticity markers (reduce AI probability) ---
  let humanMarkers = 0;

  // Playful/informal language AI doesn't produce
  const playfulCount = (text.match(/\b(itty bitty|knick knack|thingamajig|doohickey|thingy|whatchamacallit|oopsie|whoopsie|ugh|oof|yikes|yeesh|meh|bleh|heh|pfft|welp|yup|nope|yep|hmm+|huh|eh|whew|geez|jeez|dude|omg|smh)\b/gi) || []).length;
  signals.playful_language = playfulCount;
  if (playfulCount >= 1) humanMarkers += 0.08;
  if (playfulCount >= 3) humanMarkers += 0.06;

  // Parenthetical asides — "(yup, as in a blade)", "(lol)", "(not kidding)"
  const parentheticals = (text.match(/\([^)]{2,40}\)/g) || []).length;
  signals.parentheticals = parentheticals;
  if (parentheticals >= 1) humanMarkers += 0.06;

  // Missing hyphens where grammar demands them — humans skip compound adjective hyphens
  // "well stocked" instead of "well-stocked", "long term" instead of "long-term"
  const missingHyphens = (text.match(/\b(well|long|short|high|low|full|self|over|under|hard|fast|slow|first|second|third|real|old|new|big|small) [a-z]{3,}\b/gi) || []).length;
  const hasProperHyphens = (text.match(/\b(well|long|short|high|low|full|self|over|under|hard|fast|slow|first|second|third|real|old|new|big|small)-[a-z]{3,}\b/gi) || []).length;
  if (missingHyphens > 0 && hasProperHyphens === 0) {
    signals.missing_hyphens = missingHyphens;
    humanMarkers += 0.06;
  }

  // Typos / casual spelling — real humans misspell things and use shorthand
  const typoMarkers = (text.match(/\b(tho|thru|gonna|wanna|gotta|kinda|sorta|dunno|prolly|cuz|coz|bc|rn|ur|u|r|w\/|b\/c|idk|tbf|ngl|ect|alot|definately|seperate|occured|recieve|wierd|noone|eachother|atleast|alright|thankyou|everytime|infront|aswell)\b/gi) || []).length;
  signals.typo_markers = typoMarkers;
  if (typoMarkers >= 1) humanMarkers += 0.06;
  if (typoMarkers >= 3) humanMarkers += 0.06;

  // Repeated words — "after after", "the the" — humans do this, AI doesn't
  const repeatedWords = (text.match(/\b(\w+)\s+\1\b/gi) || []).length;
  signals.repeated_words = repeatedWords;
  if (repeatedWords >= 1) humanMarkers += 0.06;

  // Repeated phrases — AI recycles its own phrases ("that didn't sit right with me" twice)
  // This is different from repeated words — it's AI reusing a 4+ word phrase
  const sentences = text.split(/[.!?]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 20);
  let repeatedPhrases = 0;
  for (let i = 0; i < sentences.length; i++) {
    const words = sentences[i].split(/\s+/);
    for (let w = 0; w < words.length - 3; w++) {
      const phrase = words.slice(w, w + 4).join(' ');
      for (let j = i + 1; j < sentences.length; j++) {
        if (sentences[j].includes(phrase)) { repeatedPhrases++; break; }
      }
    }
  }
  // Cap it — we don't need to count every overlap
  repeatedPhrases = Math.min(repeatedPhrases, 5);
  signals.repeated_phrases = repeatedPhrases;

  signals.human_markers = humanMarkers;
  aiProb -= humanMarkers;

  // --- Human void detection ---
  // The longer a post is, the more human messiness we expect to see.
  // A long post with ZERO human markers is itself a strong AI signal.
  if (wordCount >= 150 && humanMarkers <= 0.06) {
    // Check for complete absence of human texture
    const hasAnyTypos = typoMarkers > 0;
    const hasAnySlang = playfulCount > 0 || forcedCasualCount > 0;
    const hasParentheticals = parentheticals > 0;
    // Scattered fragments = human. Stacked fragments = AI drama.
    // Only count as human texture if fragments aren't consecutive.
    const allSentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    const fragmentIndices: number[] = [];
    allSentences.forEach((s, i) => {
      if (s.split(/\s+/).length <= 3) fragmentIndices.push(i);
    });
    const hasStackedFragments = fragmentIndices.some((idx, i) =>
      i > 0 && fragmentIndices[i - 1] === idx - 1
    );
    const hasFragments = fragmentIndices.length > 0 && !hasStackedFragments;
    const hasProfanity = /\b(fuck|shit|damn|hell|ass|crap|wtf|omg|ffs|jfc|bs|smh)\b/i.test(text);
    const hasExclamation = text.includes('!');
    const hasAllCaps = /\b[A-Z]{2,}\b/.test(text.replace(/\b(I|TL|DR|AITA|AITJ|AITAH|NTA|YTA|ESH|NAH|EDC|TLDR)\b/g, ''));

    const humanTextures =
      (hasAnyTypos ? 1 : 0) +
      (hasAnySlang ? 1 : 0) +
      (hasParentheticals ? 1 : 0) +
      (hasFragments ? 1 : 0) +
      (hasProfanity ? 1 : 0) +
      (hasExclamation ? 1 : 0) +
      (hasAllCaps ? 1 : 0);

    signals.human_textures = humanTextures;

    // Long post with barely any human texture = suspicious
    // Scale penalty with post length — 600 words with zero messiness is worse than 200
    const lengthFactor = Math.min(1, wordCount / 400);
    if (humanTextures <= 1) {
      const voidPenalty = (2 - humanTextures) * 0.08 * lengthFactor;
      signals.human_void = voidPenalty;
      aiProb += voidPenalty;
    }
  }

  // AI phrase recycling — reusing the same 4-word phrases in a post
  if (repeatedPhrases >= 2) aiProb += 0.08;
  else if (repeatedPhrases >= 1) aiProb += 0.04;

  // Combo: forced-casual + clean structure = prompted AI mimicking Reddit
  if (forcedCasualCount >= 3 && anecdote >= 0.3) {
    aiProb += 0.15;
    signals.mimicry_combo = 1;
  }

  // Prose polish — consistent grammar, capitalization, sentence structure
  const polish = prosePolishScore(text);
  signals.prose_polish = polish;
  aiProb += polish * 0.15;


  // Unicode em dash — real Redditors almost never type these. They use -- or just -.
  // An actual — character is a strong AI fingerprint on its own.
  const emDashCount = (text.match(/—/g) || []).length;
  signals.em_dashes = emDashCount;
  if (emDashCount >= 1) aiProb += 0.12;
  if (emDashCount >= 3) aiProb += 0.08;

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
  // Only penalize very new/low-karma accounts. Old accounts and high karma
  // are NOT positive signals — accounts get farmed, aged, and sold.
  let accountTrust = 0.5;
  if (author) {
    if (author.accountAgeDays != null) {
      signals.account_age_days = author.accountAgeDays;
      if (author.accountAgeDays < 30) accountTrust -= 0.2;
    }
    if (author.karma != null) {
      signals.karma = author.karma;
      if (author.karma < 100) accountTrust -= 0.15;
    }
  }

  if (upvotes != null) {
    signals.upvotes = upvotes;
    if (upvotes < -2) accountTrust -= 0.1;
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
    (fingerprintCount >= 2 ? 1 : 0) +        // multiple ChatGPT fingerprints
    (dramaticCount >= 2 ? 1 : 0) +           // multiple dramatic patterns
    (engagementCount >= 2 ? 1 : 0) +         // engagement bait signals
    (polish >= 0.6 ? 1 : 0);                 // suspiciously polished prose
  signals.structural_tells = structuralTells;

  // Abstract advice with no first-person experience
  const abstractAdvice = abstractAdviceScore(text);
  signals.abstract_advice = abstractAdvice;
  aiProb += abstractAdvice * 0.12;

  // Essay structure — clean paragraphs, topic sentences, even lengths
  const essay = essayStructureScore(text);
  signals.essay_structure = essay;
  aiProb += essay * 0.12;

  // Second-person narrative voice — "You might find yourself..."
  // Real Reddit posts are first person. AI uses second person for dramatic effect.
  if (wordCount > 80) {
    const youCount = (text.match(/\byou (will|might|may|could|would|find|realize|wonder|know|think|feel|see|start|have|are|were|went|take)\b/gi) || []).length;
    const iCount = (text.match(/\bI (was|am|did|had|went|started|tried|thought|felt|realized|found|made|got|quit|left|built|worked)\b/gi) || []).length;
    signals.second_person_narrative = youCount;
    signals.first_person_narrative = iCount;
    if (youCount >= 4 && iCount === 0) aiProb += 0.12;
    else if (youCount >= 3 && iCount <= 1) aiProb += 0.06;
  }

  // Formal grammar tells — "whom", "one might", "whilst"
  // Real Redditors don't use these
  // Formal grammar — only counts when other AI tells are present
  const formalGrammar = (text.match(/\b(whom|whilst|thereafter|furthermore|notwithstanding|henceforth|aforementioned|pertaining|one might|one could|one would)\b/gi) || []).length;
  signals.formal_grammar = formalGrammar;

  // Stacked fragments — "Nothing to conquer. Nothing to eat. Winter coming."
  // AI uses consecutive short sentences for dramatic effect. Humans don't.
  const allSents = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  let stackedFragmentRuns = 0;
  let currentRun = 0;
  for (const s of allSents) {
    if (s.split(/\s+/).length <= 4) {
      currentRun++;
      if (currentRun >= 2) stackedFragmentRuns++;
    } else {
      currentRun = 0;
    }
  }
  signals.stacked_fragments = stackedFragmentRuns;
  if (stackedFragmentRuns >= 2) aiProb += 0.1;
  else if (stackedFragmentRuns >= 1) aiProb += 0.05;

  // Hyphen-as-dash evasion — "word- next" instead of em dash
  const fakeEmDash = (text.match(/\w-\s\w/g) || []).length;
  signals.fake_em_dash = fakeEmDash;
  if (fakeEmDash >= 2) aiProb += 0.08;

  // Rhetorical question density — AI loves ending paragraphs with questions
  const questionCount = (text.match(/\?/g) || []).length;
  const paragraphCount = text.split(/\n\n/).filter(Boolean).length || 1;
  const questionRatio = questionCount / paragraphCount;
  signals.question_density = questionRatio;
  if (questionRatio > 0.5 && questionCount >= 2) aiProb += 0.06;

  // Dramatic pivot — "That's [X] right now." single-sentence paragraph
  const shortParas = text.split(/\n\n/).filter((p) => {
    const trimmed = p.trim();
    return trimmed.length > 5 && trimmed.length < 60 && trimmed.split(/\s+/).length <= 8;
  });
  const dramaticPivots = shortParas.filter((p) =>
    /^(that'?s|this is|welcome to|sound familiar)\b/i.test(p.trim())
  ).length;
  signals.dramatic_pivots = dramaticPivots;
  if (dramaticPivots >= 1) aiProb += 0.08;

  // Title red flags — AI clickbait titles amplify body AI probability
  const titleScore = title ? titleRedFlagScore(title) : 0;
  signals.title_red_flag = titleScore;
  aiProb += titleScore * 0.15;

  // Compound multiplier — when multiple AI tells stack without any human
  // markers to counterbalance, amplify the AI probability.
  const redFlags =
    (emDashCount >= 1 ? 1 : 0) +
    (polish >= 0.5 ? 1 : 0) +
    (specificity <= 0.55 ? 1 : 0) +         // vague, no concrete details
    (engagementCount >= 1 ? 1 : 0) +
    (fingerprintCount >= 1 ? 1 : 0) +
    (parallelCount >= 1 ? 1 : 0) +
    (dramaticCount >= 1 ? 1 : 0) +
    (hedgingCount >= 1 ? 1 : 0) +
    (titleScore >= 0.3 ? 1 : 0) +             // clickbait title
    (formalGrammar >= 1 ? 1 : 0);             // whom, whilst etc — only matters in context
  const humanCounterweight = humanMarkers > 0.1 ? 1 : 0;
  const netFlags = Math.max(0, redFlags - humanCounterweight);
  signals.red_flags = redFlags;
  signals.net_flags = netFlags;

  // 3+ net flags = 10% boost per flag above 2. Compounding effect.
  if (netFlags >= 3) {
    aiProb = clamp(aiProb + (netFlags - 2) * 0.1);
  }

  // When structural AI patterns are present, specificity should NOT rescue
  // the score — prompted AI has specificity too. Degrade specificity weight
  // proportionally to how many structural tells fired.
  const specificityDampen = Math.max(0, 1 - structuralTells * 0.3);
  signals.specificity_dampen = specificityDampen;

  // Human texture score — separate dimension from AI probability.
  // Measures how "messy" the writing is. Real humans leave fingerprints.
  let humanTexture = 0.5; // neutral baseline
  humanTexture += humanMarkers * 1.5; // typos, slang, parentheticals boost it
  if (signals.human_void) humanTexture -= signals.human_void;
  if (signals.human_textures != null) {
    // More texture types present = more human
    humanTexture += (signals.human_textures / 7) * 0.3;
  }
  humanTexture = clamp(humanTexture);

  // Fold account trust into aiProb as a minor modifier, not a separate dimension
  if (accountTrust < 0.5) {
    aiProb += (0.5 - accountTrust) * 0.15;
    aiProb = clamp(aiProb);
  }

  // --- Final score ---
  // 3 dimensions: AI probability (primary), specificity, emotional variance
  // + human texture as a direct modifier
  const overall = clamp(
    (1 - aiProb) * 0.45 +
      specificity * 0.20 * specificityDampen +
      emotVar * 0.15 +
      humanTexture * 0.20,
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
