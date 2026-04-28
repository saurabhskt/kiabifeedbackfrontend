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
    id: 'd1', section: 'Discovery', sectionColor: '#AFA9EC', bg: '#3C3489',
    emoji: '📱',
    type: 'choice',
    multiSelect: true,
    statement: 'How did you hear about this sale? (tick all that apply)',
    options: [
      { value: 'whatsapp',   label: 'WhatsApp from a colleague or friend' },
      { value: 'instagram',  label: 'KIABI India\'s Instagram / social media' },
      { value: 'office',     label: 'Notice at Vatika Business Park / office board' },
      { value: 'banner',     label: 'Poster or banner outside' },
      { value: 'kiabi_team', label: 'Personally invited by the KIABI team' },
      { value: 'other',      label: 'Other', isOther: true },
    ],
  },

  // ── SECTIONS SHOPPED ─────────────────────────────────────────────
  {
    id: 's1', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#993556',
    emoji: '👀',
    statement: 'Were you mostly just browsing today?',
  },
  {
    id: 's2', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#72243E',
    emoji: '👗',
    statement: 'Did you shop from the Women\'s section today?',
  },
  {
    id: 's3', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#040037',
    emoji: '👔',
    statement: 'Did you browse or buy from the Men\'s section?',
  },
  {
    id: 's4', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#040037',
    emoji: '👧',
    statement: 'Did you pick up anything from the Kids\' Girls section?',
  },
  {
    id: 's5', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#040037',
    emoji: '👦',
    statement: 'Did you shop from the Kids\' Boys section?',
  },
  {
    id: 's6', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#4B1528',
    emoji: '👶',
    statement: 'Did you pick up anything from the Baby or Newborn section?',
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
  {
    id: 'r2', section: 'Recommendation', sectionColor: '#85B7EB', bg: '#0C447C',
    emoji: '🔄',
    statement: 'Would you come back to the next KIABI sample sale?',
  },

  // ── INCOME RANGE ─────────────────────────────────────────────────
  {
    id: 'i1', section: 'Income Range', sectionColor: '#FAC775', bg: '#854F0B',
    emoji: '💼',
    type: 'choice',
    multiSelect: false,
    statement: 'What is your approximate monthly household income? (optional)',
    options: [
      { value: 'below_50k',  label: 'Below ₹50,000' },
      { value: '50k_1L',     label: '₹50,000 – ₹1,00,000' },
      { value: '1L_2L',      label: '₹1,00,000 – ₹2,00,000' },
      { value: '2L_3.5L',    label: '₹2,00,000 – ₹3,50,000' },
      { value: 'above_3.5L', label: 'Above ₹3,50,000' },
      { value: 'prefer_not', label: 'Prefer not to say' },
    ],
  },

  // ── OVERALL ──────────────────────────────────────────────────────
  {
    id: 'o1', section: 'Overall', sectionColor: '#AFA9EC', bg: '#3C3489',
    emoji: '⭐',
    statement: 'Did today\'s KIABI sample sale meet your overall expectations?',
  },
  {
    id: 'o2', section: 'Overall', sectionColor: '#AFA9EC', bg: '#534AB7',
    emoji: '🏬',
    statement: 'Would you love for KIABI to open a permanent store in your city?',
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
