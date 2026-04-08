/** AI-typical hedging phrases. */
export const HEDGING_PATTERNS: RegExp[] = [
  /it'?s worth noting/i,
  /it'?s important to/i,
  /that being said/i,
  /having said that/i,
  /on the other hand/i,
  /all in all/i,
  /in conclusion/i,
  /overall[,.]? I would say/i,
  /while not perfect/i,
  /for what it'?s worth/i,
  /at the end of the day/i,
  /in terms of/i,
  /when it comes to/i,
  /I would definitely recommend/i,
  /I highly recommend/i,
];

/**
 * ChatGPT fingerprint phrases — heavily overrepresented in AI-generated
 * Reddit content but rare in genuine human posts.
 */
export const CHATGPT_FINGERPRINTS: string[] = [
  'delve',
  'navigate',
  'landscape',
  'as an ai',
  "i don't have personal",
  "in today's digital",
  'it is worth noting',
  'in this article',
  'comprehensive guide',
  'key takeaways',
  'pros and cons',
  'factors to consider',
  'nuanced',
  'multifaceted',
  'arguably',
  'leverag', // catches leverage, leveraging, etc.
  'game changer',
  'game-changer',
  'a holistic',
  // "it's X, it's Y" parallel structure — AI loves this
  "it's free",
  "it's not",
  // "X, not Y" contrasting pairs
  'statistical, not',
  // filler qualifiers
  'that said',
  'with that in mind',
  'to be fair',
];

/**
 * Suspiciously comprehensive keyword coverage.
 * Adapted from product-review feature words to general Reddit post markers.
 */
export const SLOP_COVERAGE_WORDS: string[] = [
  'comprehensive',
  'step by step',
  'in summary',
  'ultimately',
  'it depends on',
  'key points',
  'important to note',
  'worth mentioning',
  'in my experience',
  'that said',
  'on the flip side',
  'bottom line',
  'takeaway',
  'in essence',
];

export const POSITIVE_WORDS = new Set([
  'love', 'great', 'amazing', 'excellent', 'perfect', 'fantastic',
  'awesome', 'wonderful', 'best', 'happy', 'impressed', 'solid',
  'recommend', 'worth',
]);

export const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'worst', 'horrible', 'bad', 'poor',
  'disappointed', 'frustrating', 'annoying', 'broken', 'cheap',
  'waste', 'regret', 'unfortunately',
]);

export const CONTRAST_WORDS = new Set([
  'but', 'however', 'although', 'though', 'except', 'despite',
]);

export const COMPARISON_MARKERS: string[] = [
  'compared to', 'better than', 'worse than', 'switched from',
  'upgraded from', 'used to have', 'previously had',
];

export const PROBLEM_MARKERS: string[] = [
  'broke', 'cracked', 'peeled', 'stopped working', 'fell apart',
  "doesn't fit", 'runs small', 'runs large', 'overheats',
  'battery dies', 'loud noise', 'squeaks', 'rattles',
];

/**
 * Forced-casual markers — AI trying to sound like a Redditor.
 * Individually normal, but stacking 4+ in one comment is a tell.
 */
export const FORCED_CASUAL_MARKERS: string[] = [
  'lmao', 'lol', 'ngl', 'tbh', 'imo', 'imho', 'fr fr', 'deadass',
  'literally', 'honestly', 'genuinely', 'lowkey', 'highkey',
  'idk', 'iirc', 'fwiw', 'smh', 'istg',
];

/**
 * AI anecdote structure patterns — AI loves to open with agreement,
 * tell a perfect little story, then add "the one thing i'd add".
 */
export const ANECDOTE_OPENERS: RegExp[] = [
  /^this+s*[.!]?\s/im,                          // "thisssss" / "this."
  /^honestly[,.]?\s/im,                          // "honestly, ..."
  /^ok so\b/im,                                  // "ok so I..."
  /^not gonna lie\b/im,                          // "not gonna lie..."
  /^can confirm\b/im,                            // "can confirm..."
  /^hard agree\b/im,                             // "hard agree"
  /^came here to say\b/im,                       // "came here to say this"
];

/**
 * Parallel structure — "It's X, it's Y, and it Z" or "It does X. It doesn't Y."
 * AI loves writing in these clean paired/tripled constructions.
 */
export const PARALLEL_STRUCTURE: RegExp[] = [
  /it'?s \w+,\s*it'?s \w+/i,                    // "it's free, it's fast"
  /it \w+s \w+\.\s*it \w+s \w+\./i,              // "It does X. It does Y."
  /it'?s \w+[,.].*it'?s not \w+/i,               // "it's X, it's not Y"
  /\bwhat works\b.*\bwhat doesn'?t\b/is,          // "what works / what doesn't"
];

export const ANECDOTE_TRANSITIONS: RegExp[] = [
  /\balso the\b.*\b(thing|part|advice)\b/i,      // "also the X thing/part"
  /\bthe one thing i'?d add\b/i,                 // "the one thing i'd add"
  /\bthe only thing i'?d say\b/i,
  /\bon top of that\b/i,
  /\band honestly\b/i,                            // "and honestly..."
  /\blike people will\b/i,                        // "like people will X but Y"
];

/**
 * Structural tells — AI writes in clean paragraph blocks where each
 * paragraph makes exactly one point, often with a topic sentence.
 */
export const PARAGRAPH_TOPIC_STARTERS: RegExp[] = [
  /^also\b/im,
  /^the one thing\b/im,
  /^the only\b/im,
  /^another thing\b/im,
  /^on top of\b/im,
  /^plus\b/im,
  /^oh and\b/im,
];

/** Weights for overall authenticity formula. */
export const WEIGHTS = {
  ai: 0.25,
  paid: 0.20,
  specificity: 0.20,
  emotionalVariance: 0.15,
  accountTrust: 0.20,
} as const;
