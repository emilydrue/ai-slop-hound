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
  'holistic growth',
  'holistic approach',
  'ripple effect',
  'compound into',
  'compound over time',
  'lasting change',
  'real, lasting',
  'overall well-being',
  'overall wellbeing',
  'quick wins',
  'life hack',
  'mind-blowing',
  'overhaul your',
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
  'incredible', 'invaluable', 'exciting', 'beautiful', 'grateful',
  'thankful', 'glad', 'thrilled', 'enjoyed', 'fun', 'nice',
  'lovely', 'cool', 'dope', 'fire', 'goated', 'blessed',
]);

export const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'worst', 'horrible', 'bad', 'poor',
  'disappointed', 'frustrating', 'annoying', 'broken', 'cheap',
  'waste', 'regret', 'unfortunately', 'sucks', 'garbage', 'trash',
  'crap', 'bullshit', 'pissed', 'furious', 'angry', 'scared',
  'worried', 'anxious', 'stressed', 'upset', 'hurt', 'painful',
  'disgusting', 'ridiculous', 'stupid', 'dumb', 'lame', 'meh',
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
  /\bthe \w+, the \w+, the \w+/i,                // "the X, the Y, the Z" tricolon
  /\bthe \w+\.\s*the \w+\.\s*the \w+/i,          // "The X. The Y. The Z." fragment tricolon
  /\bi'?m not .{5,40}\.\s*i'?m .{5,40}\./i,      // "I'm not X. I'm Y."
  /\bi'?m not saying .{3,40}\.\s*.{0,10}but\b/i,  // "I'm not saying X. But Y."
  /\bnot just .{3,30}\.\s*i am\b/i,
  /\bthink bigger\b.*\bact\b/i,
  /\byou'?re not \w+\.\s*you'?re \w+/i,          // "you're not X. You're Y."
  /\bthe thing .{5,30} is .{5,30} you need to\b/i, // "the thing you X is the thing you need to Y"
  /\bstopped .{3,20} and started\b/i,            // "stopped X and started Y"
  /\bnot \w+[,.]?\s*but \w+/i,                   // "Not X, but Y"
  /\bi was .{3,30}\.\s*i am .{3,30}\./i,          // "I was X. I am Y." transformation
  /\bdon'?t \w+ \w+\.\s*they \w+/i,              // "People don't buy X. They buy Y."
  /\bstop \w+.{3,60}start \w+/i,                 // "stop being X...start becoming Y"
  /\bisn'?t .{3,20}\.\s*it'?s /i,                // "It isn't X. It's Y."
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
  /\bchanged everything\b/i,
  /\bbut now\?\s/i,
  /\bno fluff\b/i,
  /\bshouting into the void\b/i,
  /\bembark on a journey\b/i,
  /\bin a world where\b/i,
  /\bas technology continues to evolve\b/i,
  /\bthe answer surprised me\b/i,
  /\bthen one \w+day\b/i,                         // "Then one Tuesday/Monday..."
  /\bthat was \d+ months? ago\b/i,                // "That was 8 months ago."
  /\bif you'?re struggling\b/i,
  /\bjust know\b/i,                               // "just know: you're not broken"
  /\bwow this blew up\b/i,
  /\bdidn'?t expect this to resonate\b/i,
  /\bwould love to hear\b/i,
  /\bhear your stor(y|ies)\b/i,
  /\bi'?m not saying it was easy\b/i,
];

/**
 * Engagement bait — fake vulnerability + call to action + grateful edit.
 * Classic AI slop formula for karma farming.
 */
export const ENGAGEMENT_BAIT: RegExp[] = [
  /\bin the comments\b/i,                          // "hear your stories in the comments"
  /\bwow this blew up\b/i,
  /\bthank you for .{0,20}kind words\b/i,
  /\bdidn'?t expect this\b/i,
  /\bthis resonat/i,                              // "this resonated", "this to resonate"
  /\byou'?re not (broken|alone|crazy)\b/i,
  /\bif this helps? even one person\b/i,
  /\bshare your (stor|experience|thought)/i,
  /\bwho else (has|feels|thinks)\b/i,
  /\bdrop .{0,10}(below|comment)/i,               // "drop your thoughts below"
  /\blooking forward to hearing\b/i,
  /\bcurious what you .{0,10}think\b/i,
  /\bwhat do you .{0,10}think\b/i,
  /\blet me know .{0,10}(below|comment|thought)/i,
  /\bmore people (need to|should)\b/i,
  /\blet'?s (debate|discuss|talk about) this\b/i,
  /\bthoughts\?/i,                                // "thoughts?" as a closer
  /\bchange my mind\b/i,
];

/** Weights for overall authenticity formula. */
export const WEIGHTS = {
  ai: 0.30,
  paid: 0.15,
  specificity: 0.20,
  emotionalVariance: 0.20,
  accountTrust: 0.15,
} as const;
