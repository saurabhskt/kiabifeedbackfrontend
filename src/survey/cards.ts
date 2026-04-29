// cards.ts

export type VoteType = 'yes' | 'nope';
export type CardType = 'binary' | 'choice' | 'scale';

export interface ChoiceOption {
  value: string;
  label: string;
  isOther?: boolean;
}

export interface SurveyCard {
  id: string;
  section: string;
  sectionColor: string;
  bg: string;
  emoji: string;
  statement: string;
  type?: CardType;           // default = 'binary'
  // for type === 'choice'
  options?: ChoiceOption[];
  multiSelect?: boolean;
  // for type === 'scale'
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: [string, string];
}

export const SURVEY_CARDS: SurveyCard[] = [

  // ── DISCOVERY ────────────────────────────────────────────────────
  {
    id: 's1', section: 'Sections Shopped', sectionColor: '#AFA9EC', bg: '#3C3489',
    emoji: '👗',
    type: 'choice',
    multiSelect: true,
    statement: 'Which sections did you shop today? (tick all that apply)?',
    options: [
      { value: 'women',   label: 'Women' },
      { value: 'men',  label: 'Men' },
      { value: 'girl',     label: 'Kids(Girl)' },
      { value: 'boy',     label: 'Kids(Boy)' },
      { value: 'new_born', label: 'Baby/Newborn' },
      { value: 'just_browsing',      label: 'Just browsing'},
    ],
  },



  // ── BRAND AWARENESS ──────────────────────────────────────────────
  {
    id: 'k1', section: 'Brand Awareness', sectionColor: '#F5C97A', bg: '#8B5E15',
    emoji: '🏷️',
    statement: 'Did you know KIABI before visiting this sale?',
  },

  // ── STYLE PERCEPTION ─────────────────────────────────────────────
  {
    id: 'st1', section: 'Style Perception', sectionColor: '#93D9ED', bg: '#0E5F75',
    emoji: '✨',
    type: 'choice',
    multiSelect: true,
    statement: 'How would you describe KIABI\'s styles? (pick up to 2)',
    options: [
      { value: 'trendy',    label: 'Trendy & fashionable' },
      { value: 'casual',    label: 'Everyday casual / comfortable' },
      { value: 'family',    label: 'Family-friendly' },
      { value: 'european',  label: 'Too European / not for Indian taste' },
      { value: 'basic',     label: 'Basic / nothing special' },
      { value: 'other',     label: 'Other', isOther: true },
    ],
  },

  // ── PRICE PERCEPTION ─────────────────────────────────────────────
  {
    id: 'p1', section: 'Price Perception', sectionColor: '#A8E6A3', bg: '#2B6B26',
    emoji: '💰',
    type: 'choice',
    multiSelect: false,
    statement: 'What did you think of the prices (MRP) at the sale?',
    options: [
      { value: 'excellent', label: 'Excellent value' },
      { value: 'fair',      label: 'Fair / reasonable' },
      { value: 'okay',      label: 'Okay, expected more discount' },
      { value: 'high',      label: 'Too high even at sample sale prices' },
    ],
  },

  // ── SHOPPING HABITS ──────────────────────────────────────────────
  {
    id: 'sh1', section: 'Shopping Habits', sectionColor: '#F0A87A', bg: '#7A3010',
    emoji: '🛒',
    type: 'choice',
    multiSelect: true,
    statement: 'Where do you usually shop for clothes? (tick all that apply)',
    options: [
      { value: 'mass',    label: 'Reliance Trends / Max / Pantaloons / Westside / Zudio' },
      { value: 'intl',    label: 'H&M / Zara / Uniqlo / Marks & Spencer' },
      { value: 'online',  label: 'Myntra / Ajio (online only)' },
      { value: 'local',   label: 'Local markets (Sarojini, Lajpat, etc.)' },
      { value: 'premium', label: 'Premium brands (Tommy Hilfiger, GAP, Levi\'s, etc.)' },
      { value: 'other',   label: 'Other', isOther: true },
    ],
  },

  // ── MYNTRA INTENT ────────────────────────────────────────────────
  {
    id: 'm1', section: 'Myntra Intent', sectionColor: '#B4B2A9', bg: '#444441',
    emoji: '📲',
    statement: 'Were you already aware that KIABI is available on Myntra before today?',
  },
  {
    id: 'm2', section: 'Myntra Intent', sectionColor: '#B4B2A9', bg: '#2C2C2A',
    emoji: '🛍️',
    type: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Very unlikely', 'Very likely'],
    statement: 'After today, how likely are you to shop KIABI on Myntra?',
  },

  // ── RECOMMENDATION ───────────────────────────────────────────────
  {
    id: 'r1', section: 'Recommendation', sectionColor: '#85B7EB', bg: '#185FA5',
    emoji: '📣',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: ['Not at all', 'Definitely'],
    statement: 'Would you recommend KIABI to a friend or colleague?',
  },

  // ── INCOME RANGE ─────────────────────────────────────────────────
  {
    id: 'i1', section: 'Income Range', sectionColor: '#FAC775', bg: '#854F0B',
    emoji: '💼',
    type: 'choice',
    multiSelect: false,
    statement: 'What is your approximate monthly household income? (optional)',
    options: [
        { value: 'under_5L',    label: 'Under ₹5,00,000' },
      { value: 'above_5L', label: 'Above ₹5,00,000' },
      { value: 'prefer_not', label: 'Prefer not to say' },
    ],
  },

  // ── OVERALL ──────────────────────────────────────────────────────

  {
    id: 'o1', section: 'Overall', sectionColor: '#AFA9EC', bg: '#534AB7',
    emoji: '🏬',
    statement: 'Would you love for KIABI to open a store in your city?',
  },
];

export const CARD_INDEX: Record<string, number> = {};
SURVEY_CARDS.forEach((c, i) => { CARD_INDEX[c.id] = i; });

/** Always advances sequentially. Returns -1 when survey is complete. */
export function getNextIndex(currentId: string): number {
  const idx = CARD_INDEX[currentId];
  const next = idx + 1;
  return next >= SURVEY_CARDS.length ? -1 : next;
}

/** Derives income bracket from the i1 choice card answer value. */
export function deriveIncomeBracket(answerMap: Record<string, string>): string {
  return answerMap['i1'] ?? 'not_answered';
}
