/** AI-typical hedging phrases. */
export const HEDGING_PATTERNS: RegExp[] = [
  /it'?s worth noting/i,
  /it'?s important to/i,
  /it is important to/i,
  /that being said/i,
  /having said that/i,
  /on the other hand/i,
  /all in all/i,
  /in conclusion/i,
  /to summarize/i,
  /overall[,.]? I would say/i,
  /while not perfect/i,
  /for what it'?s worth/i,
  /at the end of the day/i,
  /in terms of/i,
  /when it comes to/i,
  /I would definitely recommend/i,
  /I highly recommend/i,
  /one might argue/i,
  /it goes without saying/i,
  /based on the information provided/i,
  /this is particularly true/i,
  /in light of this/i,
  /with that in mind/i,
  /it'?s also worth/i,
];

/**
 * AI fingerprint words and phrases — heavily overrepresented in
 * AI-generated content but rare in genuine human posts.
 * Sources: Carnegie Mellon 2025, WHYY/Buffer corpus analysis, Originality.AI
 */
export const CHATGPT_FINGERPRINTS: string[] = [
  // Tier 1: extreme overuse (50x+ vs human baseline)
  'delve',
  'tapestry',
  'camaraderie',
  'palpable',
  'underscore',
  'intricate',

  // Tier 2: heavy overuse (10-40x)
  'multifaceted',
  'nuanced',
  'landscape',        // metaphorical "the landscape of..."
  'pivotal',
  'paramount',
  'comprehensive',
  'robust',
  'vibrant',
  'realm',
  'embark',
  'endeavor',
  'endeavour',

  // Tier 3: moderate overuse
  'crucial',
  'compelling',
  'leverag',          // leverage, leveraging, leveraged
  'utilize',
  'facilitate',
  'streamline',
  'foster',
  'bolster',
  'fortify',
  'safeguard',
  'elevate',
  'empower',
  'harness',
  'transformative',
  'revolutionize',
  'beacon',
  'treasure trove',
  'navigate',         // metaphorical
  'resonate',
  'captivat',         // captivate, captivating
  'forge',
  'unveil',
  'mitigat',          // mitigate, mitigating
  'testament',

  // AI self-identification
  'as an ai',
  "i don't have personal",

  // Phrase-level fingerprints
  "in today's digital",
  "in today's fast-paced",
  "in today's competitive",
  'in the realm of',
  'in an era where',
  'in a sea of',
  'comprehensive guide',
  'key takeaways',
  'factors to consider',
  'a holistic',
  'game changer',
  'game-changer',
  'foster innovation',
  'drive engagement',
  'harness the power',
  'navigate the complexit',
  'unlock the potential',
  'shed light on',
  'reaching new heights',
  'uncharted waters',

  // Conversational ChatGPT tells
  'great question',
  "that's a really great point",
  "here's the thing",
  "here's the kicker",
  "let's dive in",
  "let's dive into",
  'an ongoing voyage',
  'captivating narrative',
];

/**
 * Suspiciously comprehensive keyword coverage — AI tries to be thorough.
 */
export const SLOP_COVERAGE_WORDS: string[] = [
  'step by step',
  'in summary',
  'ultimately',
  'it depends on',
  'key points',
  'important to note',
  'worth mentioning',
  'on the flip side',
  'bottom line',
  'takeaway',
  'in essence',
  'furthermore',
  'moreover',
  'additionally',
  'consequently',
  'nevertheless',
];

export const POSITIVE_WORDS = new Set([
  'love', 'great', 'amazing', 'excellent', 'perfect', 'fantastic',
  'awesome', 'wonderful', 'best', 'happy', 'impressed', 'solid',
  'recommend', 'worth', 'brilliant', 'groundbreaking', 'insightful',
  'incredible', 'invaluable',
]);

export const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'worst', 'horrible', 'bad', 'poor',
  'disappointed', 'frustrating', 'annoying', 'broken', 'cheap',
  'waste', 'regret', 'unfortunately', 'sucks', 'garbage', 'trash',
  'crap', 'bullshit', 'pissed', 'furious',
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
  'idk', 'iirc', 'fwiw', 'smh', 'istg', 'bruh', 'fam',
  'no cap', 'bet', 'sus', 'vibe', 'vibes', 'slay', 'bro',
];

/**
 * AI anecdote structure patterns — AI loves to open with agreement,
 * tell a perfect little story, then add "the one thing i'd add".
 */
export const ANECDOTE_OPENERS: RegExp[] = [
  /^this+s*[.!]?\s/im,
  /^honestly[,.]?\s/im,
  /^ok so\b/im,
  /^not gonna lie\b/im,
  /^can confirm\b/im,
  /^hard agree\b/im,
  /^came here to say\b/im,
  /^absolutely[.!]?\s/im,                        // "Absolutely! ..."
  /^100%\s/im,                                    // "100% this"
];

/**
 * Parallel structure — rhetorical constructions real people rarely use.
 */
export const PARALLEL_STRUCTURE: RegExp[] = [
  /it'?s \w+,\s*it'?s \w+/i,
  /it \w+s \w+\.\s*it \w+s \w+\./i,
  /it'?s \w+[,.].*it'?s not \w+/i,
  /\bwhat works\b.*\bwhat doesn'?t\b/is,
  /\bthe \w+, the \w+, the \w+/i,                // tricolon
  /\bi'?m not .{5,40}\.\s*i'?m .{5,40}\./i,      // antithetical pair
  /\bnot just .{3,30}\.\s*i am\b/i,
  /\bi'?m not leaving .{3,40}\.\s*i'?m leaving\b/i,
  /\bthink bigger\b.*\bact\b/i,                  // "Think bigger. Act bolder."
  /\bnot \w+[,.]?\s*but \w+/i,                   // "Not X, but Y"
];

export const ANECDOTE_TRANSITIONS: RegExp[] = [
  /\balso the\b.*\b(thing|part|advice)\b/i,
  /\bthe one thing i'?d add\b/i,
  /\bthe only thing i'?d say\b/i,
  /\bon top of that\b/i,
  /\band honestly\b/i,
  /\blike people will\b/i,
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
  /^furthermore\b/im,
  /^moreover\b/im,
  /^additionally\b/im,
];

/**
 * Intensifiers without substance — AI stacks these to sound enthusiastic.
 * "absolutely brilliant", "truly groundbreaking", "incredibly insightful"
 */
export const EMPTY_INTENSIFIERS: RegExp[] = [
  /\babsolutely \w+/i,
  /\btruly \w+/i,
  /\bincredibly \w+/i,
  /\bgenuinely \w+/i,
  /\bremarkably \w+/i,
  /\bprofoundly \w+/i,
];

/**
 * Dramatic rhetorical patterns — AI's "voice" when trying to be compelling.
 */
export const DRAMATIC_PATTERNS: RegExp[] = [
  /\bsomething shifted\b/i,
  /\beverything changed\b/i,
  /\bbut now\?\s/i,                               // "But now? [dramatic statement]"
  /\bno fluff\b/i,
  /\bshouting into the void\b/i,
  /\bembark on a journey\b/i,
  /\bin a world where\b/i,
  /\bas technology continues to evolve\b/i,
];

/** Weights for overall authenticity formula. */
export const WEIGHTS = {
  ai: 0.25,
  paid: 0.20,
  specificity: 0.20,
  emotionalVariance: 0.15,
  accountTrust: 0.20,
} as const;
