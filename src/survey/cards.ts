export type VoteType = 'yes' | 'nope';

export interface BranchRule {
  when: VoteType;       // if this answer is given...
  skipToId: string;     // ...jump to this card id (skipping everything in between)
}

export interface SurveyCard {
  id: string;
  section: string;
  sectionColor: string;
  bg: string;
  emoji: string;
  statement: string;
  branch?: BranchRule;  // optional — if absent, always goes to next card
}

export const SURVEY_CARDS: SurveyCard[] = [

  // ── DISCOVERY (5 cards) ──────────────────────────────────────────
  {
    id: 'd1', section: 'Discovery', sectionColor: '#AFA9EC', bg: '#3C3489',
    emoji: '📱',
    statement: 'Did a colleague or friend tell you about this sale on WhatsApp?',
  },
  {
    id: 'd2', section: 'Discovery', sectionColor: '#AFA9EC', bg: '#534AB7',
    emoji: '📸',
    statement: 'Did you find out through KIABI India\'s Instagram or social media?',
  },
  {
    id: 'd3', section: 'Discovery', sectionColor: '#AFA9EC', bg: '#26215C',
    emoji: '🏢',
    statement: 'Did you see the notice at Vataka Business Park or your office board?',
  },
  {
    id: 'd4', section: 'Discovery', sectionColor: '#AFA9EC', bg: '#3C3489',
    emoji: '🚶',
    statement: 'Did you walk in after spotting a poster or banner outside?',
  },
  {
    id: 'd5', section: 'Discovery', sectionColor: '#AFA9EC', bg: '#534AB7',
    emoji: '🤝',
    statement: 'Were you personally invited by someone from the KIABI team?',
  },

  // ── SECTIONS SHOPPED (6 cards) ───────────────────────────────────
  {
    id: 's1', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#993556',
    emoji: '👀',
    statement: 'Were you mostly just browsing today — without any intention to buy?',
    // If yes (just browsing) → skip all fit/sizing cards, go straight to style perception
    branch: { when: 'yes', skipToId: 'f1_skip' },
  },
  {
    id: 's2', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#72243E',
    emoji: '👗',
    statement: 'Did you shop from the Women\'s section today?',
  },
  {
    id: 's3', section: 'Sections Shopped', sectionColor: '#040037', bg: '#040037',
    emoji: '👔',
    statement: 'Did you browse or buy from the Men\'s section?',
  },
  {
    id: 's4', section: 'Sections Shopped', sectionColor: '#040037', bg: '#040037',
    emoji: '👧',
    statement: 'Did you pick up anything from the Kids\' Girls section?',
  },
  {
    id: 's5', section: 'Sections Shopped', sectionColor: '#040037', bg: '#040037',
    emoji: '👦',
    statement: 'Did you shop from the Kids\' Boys section?',
  },
  {
    id: 's6', section: 'Sections Shopped', sectionColor: '#ED93B1', bg: '#4B1528',
    emoji: '👶',
    statement: 'Did you pick up anything from the Baby or Newborn section?',
  },

  // ── FIT & SIZING (3 cards) ───────────────────────────────────────
  // Card s1 nope-path leads here; yes-path (just browsing) skips to st1
  {
    id: 'f1', section: 'Fit & Sizing', sectionColor: '#9FE1CB', bg: '#085041',
    emoji: '👕',
    statement: 'Did you try on clothes before deciding to buy?',
    // If nope (didn't try anything) → skip fit detail, go to size availability
    branch: { when: 'nope', skipToId: 'a1' },
  },
  {
    id: 'f2', section: 'Fit & Sizing', sectionColor: '#9FE1CB', bg: '#0F6E56',
    emoji: '📐',
    statement: 'Did the clothes you tried feel true to your usual size?',
  },
  {
    id: 'f3', section: 'Fit & Sizing', sectionColor: '#9FE1CB', bg: '#04342C',
    emoji: '↕️',
    statement: 'Did you have to size up or down from what you normally wear?',
  },

  // ── SIZE AVAILABILITY (2 cards) ──────────────────────────────────
  // "just browsing" path also skips here — f1_skip acts as alias pointing to a1
  {
    id: 'a1', section: 'Size Availability', sectionColor: '#85B7EB', bg: '#0C447C',
    emoji: '🔍',
    statement: 'Did you find your size easily in the styles you liked?',
    // If yes (found size easily) → skip the "couldn't find size" follow-up
    branch: { when: 'yes', skipToId: 'st1' },
  },
  {
    id: 'a2', section: 'Size Availability', sectionColor: '#85B7EB', bg: '#185FA5',
    emoji: '😔',
    statement: 'Were there styles you loved but couldn\'t get in your size?',
  },

  // ── STYLE PERCEPTION (4 cards) ───────────────────────────────────
  // "just browsing" skip target + normal flow both land here (id: st1)
  {
    id: 'st1', section: 'Style Perception', sectionColor: '#EF9F27', bg: '#633806',
    emoji: '✨',
    statement: 'Do you find KIABI\'s styles trendy and fashionable?',
  },
  {
    id: 'st2', section: 'Style Perception', sectionColor: '#EF9F27', bg: '#854F0B',
    emoji: '🛋️',
    statement: 'Do the clothes feel comfortable enough for everyday Indian wear?',
  },
  {
    id: 'st3', section: 'Style Perception', sectionColor: '#EF9F27', bg: '#412402',
    emoji: '👨‍👩‍👧',
    statement: 'Do you feel KIABI works well for the whole family — not just one age group?',
  },
  {
    id: 'st4', section: 'Style Perception', sectionColor: '#EF9F27', bg: '#633806',
    emoji: '🌍',
    statement: 'Do some styles feel too European or not suited to Indian taste?',
  },

  // ── PRICING (3 cards) ────────────────────────────────────────────
  {
    id: 'p1', section: 'Pricing', sectionColor: '#F0997B', bg: '#712B13',
    emoji: '💰',
    statement: 'Did the sample sale prices feel like genuinely great value?',
    // If yes → skip "expecting bigger discount" card
    branch: { when: 'yes', skipToId: 'p3' },
  },
  {
    id: 'p2', section: 'Pricing', sectionColor: '#F0997B', bg: '#993C1D',
    emoji: '🤔',
    statement: 'Were you expecting a bigger discount than what was offered?',
  },
  {
    id: 'p3', section: 'Pricing', sectionColor: '#F0997B', bg: '#4A1B0C',
    emoji: '🏷️',
    statement: 'Would you pay these prices at a regular KIABI store — not just a sale?',
  },

  // ── COMPETITORS (5 cards) ────────────────────────────────────────
  {
    id: 'c1', section: 'Competitors', sectionColor: '#97C459', bg: '#27500A',
    emoji: '🛒',
    statement: 'Do you regularly shop at Indian chains like Zudio, Max or Westside?',
  },
  {
    id: 'c2', section: 'Competitors', sectionColor: '#97C459', bg: '#3B6D11',
    emoji: '🌐',
    statement: 'Do you shop at international brands like H&M, Zara or Uniqlo?',
  },
  {
    id: 'c3', section: 'Competitors', sectionColor: '#97C459', bg: '#173404',
    emoji: '📦',
    statement: 'Is Myntra or Ajio your main place to buy clothes — mostly online?',
  },
  {
    id: 'c4', section: 'Competitors', sectionColor: '#97C459', bg: '#27500A',
    emoji: '🏪',
    statement: 'Do you shop at local markets like Sarojini Nagar or Lajpat Nagar?',
  },
  {
    id: 'c5', section: 'Competitors', sectionColor: '#97C459', bg: '#3B6D11',
    emoji: '👑',
    statement: 'Do you buy premium brands like Tommy Hilfiger, GAP or Levi\'s?',
  },

  // ── MYNTRA INTENT (2 cards) ──────────────────────────────────────
  {
    id: 'm1', section: 'Myntra Intent', sectionColor: '#B4B2A9', bg: '#444441',
    emoji: '📲',
    statement: 'Were you already aware that KIABI is available on Myntra before today?',
  },
  {
    id: 'm2', section: 'Myntra Intent', sectionColor: '#B4B2A9', bg: '#2C2C2A',
    emoji: '🛍️',
    statement: 'After today\'s experience, would you shop KIABI on Myntra?',
  },

  // ── RECOMMENDATION (2 cards) ─────────────────────────────────────
  {
    id: 'r1', section: 'Recommendation', sectionColor: '#85B7EB', bg: '#185FA5',
    emoji: '📣',
    statement: 'Would you recommend KIABI to a friend or colleague?',
  },
  {
    id: 'r2', section: 'Recommendation', sectionColor: '#85B7EB', bg: '#0C447C',
    emoji: '🔄',
    statement: 'Would you come back to the next KIABI sample sale?',
  },

  // ── INCOME RANGE (3 cards — branching pyramid) ───────────────────
  {
    id: 'i1', section: 'Income Range', sectionColor: '#FAC775', bg: '#854F0B',
    emoji: '💼',
    statement: 'Is your monthly household income above ₹1,00,000?',
    // Nope → below ₹1L bracket confirmed → skip i2 & i3, go to overall
    branch: { when: 'nope', skipToId: 'o1' },
  },
  {
    id: 'i2', section: 'Income Range', sectionColor: '#FAC775', bg: '#633806',
    emoji: '📊',
    statement: 'Is your monthly household income above ₹2,00,000?',
    // Nope → ₹1L–₹2L bracket confirmed → skip i3, go to overall
    branch: { when: 'nope', skipToId: 'o1' },
  },
  {
    id: 'i3', section: 'Income Range', sectionColor: '#FAC775', bg: '#412402',
    emoji: '💎',
    statement: 'Is your monthly household income above ₹3,50,000?',
    // Either answer → go to overall (yes = above 3.5L, nope = 2L–3.5L)
  },

  // ── OVERALL (2 cards) ────────────────────────────────────────────
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

// Build an id → index map for O(1) lookups
export const CARD_INDEX: Record<string, number> = {};
SURVEY_CARDS.forEach((c, i) => { CARD_INDEX[c.id] = i; });

/**
 * Given the current card id and the vote just cast, return the index
 * of the next card to show. Applies branch rules and skips accordingly.
 * Returns -1 when the survey is complete.
 */
export function getNextIndex(currentId: string, vote: VoteType): number {
  const currentIdx = CARD_INDEX[currentId];
  const card = SURVEY_CARDS[currentIdx];

  // Special alias: "just browsing" yes-path skips to st1 via id 'f1_skip'
  // We encode this as pointing to st1 directly
  let targetId: string | null = null;

  if (card.branch && card.branch.when === vote) {
    targetId = card.branch.skipToId === 'f1_skip' ? 'st1' : card.branch.skipToId;
  }

  if (targetId) {
    const targetIdx = CARD_INDEX[targetId];
    return targetIdx !== undefined ? targetIdx : -1;
  }

  // No branch → simply go to next card
  const next = currentIdx + 1;
  return next < SURVEY_CARDS.length ? next : -1;
}

/** Derive income bracket from i1/i2/i3 answers */
export function deriveIncomeBracket(
  answers: Record<string, VoteType>
): string {
  if (answers['i1'] === 'nope') return 'below_1L';
  if (answers['i2'] === 'nope') return '1L_2L';
  if (answers['i3'] === 'nope') return '2L_3.5L';
  if (answers['i3'] === 'yes')  return 'above_3.5L';
  return 'not_answered';
}
