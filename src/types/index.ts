// ── User profile (onboarding) ────────────────────────────────────
export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
export type AgeGroup = '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type EmploymentStatus = 'working' | 'non_working' | 'student' | 'retired';

export interface UserProfile {
  name: string;
  gender: Gender;
  ageGroup: AgeGroup;
  employmentStatus: EmploymentStatus;
  contact: string;
}

// ── Outfit reel (original feature) ───────────────────────────────
export type VoteType = 'love' | 'nope';

export interface Outfit {
  id: number;
  name: string;
  category: string;
  tag: string;
  emoji: string;
  bgColor: string;
  description: string;
}

export interface FeedbackPayload {
  userProfile: UserProfile;
  outfitId: number;
  vote: VoteType;
  dwellTimeMs: number;
}

export interface SessionSummary {
  totalSeen: number;
  loved: number;
  noped: number;
  pointsEarned: number;
  votes: { outfitName: string; vote: VoteType }[];
}

// ── Survey (sample sale feedback) ────────────────────────────────
export type SurveyVote = 'yes' | 'nope';

export interface SurveyAnswer {
  cardId: string;
  section: string;
  statement: string;
  answer: SurveyVote;
  dwellTimeMs: number;
}

export interface SurveySubmission {
  userProfile: UserProfile;
  sessionId: string;
  answers: SurveyAnswer[];
  skippedCardIds: string[];
  incomeBracket: string;
  completedAt: string;
}

export interface SurveySummary {
  totalAnswered: number;
  totalSkipped: number;
  yesCount: number;
  nopeCount: number;
  incomeBracket: string;
  sectionBreakdown: { section: string; yesRate: number; answered: number }[];
}
