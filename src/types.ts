/** Score breakdown for a single piece of content. */
export interface SlopScore {
  /** Overall authenticity: 0 = definite slop, 1 = clearly genuine. */
  overall: number;
  aiProbability: number;
  paidProbability: number;
  specificity: number;
  emotionalVariance: number;
  accountTrust: number;
  signals: Record<string, number>;
}

/** Bark severity level. */
export interface BarkLevel {
  barks: number; // 0-5
  intensity: 'none' | 'mild' | 'moderate' | 'strong' | 'severe' | 'definite';
}

/** Persisted scan result for a post. */
export interface ScanResult {
  postId: string;
  score: SlopScore;
  barkLevel: BarkLevel;
  timestamp: number;
  actionTaken: 'none' | 'commented' | 'reported' | 'removed';
}

/** Author metadata available from Reddit. */
export interface AuthorInfo {
  accountAgeDays: number | null;
  karma: number | null;
}

export type ActionMode = 'alert-only' | 'auto-remove';
export type BarkVisibility = 'public' | 'mod-only';
