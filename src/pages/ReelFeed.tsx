import { useState, useRef, useEffect, useCallback } from 'react';
import type { Outfit, UserProfile, VoteType, FeedbackPayload, SessionSummary } from '../types';
import styles from './ReelFeed.module.css';

interface Props {
  outfits: Outfit[];
  userProfile: UserProfile;
  onComplete: (summary: SessionSummary) => void;
  onSubmitFeedback: (payload: FeedbackPayload) => Promise<void>;
}

// Tracks each card's animation state independently
type CardAnim = 'idle' | 'exit-up' | 'exit-down' | 'enter';

export default function ReelFeed({ outfits, userProfile, onComplete, onSubmitFeedback }: Props) {
  const [current, setCurrent] = useState(0);
  const [votes, setVotes] = useState<{ outfit: Outfit; vote: VoteType }[]>([]);
  const [stampVisible, setStampVisible] = useState<VoteType | null>(null);
  const [animating, setAnimating] = useState(false);

  // cardAnim: drives CSS class on the TOP card during exit
  const [cardAnim, setCardAnim] = useState<CardAnim>('idle');
  // nextAnim: drives CSS class on the NEXT card (slides up from below)
  const [nextAnim, setNextAnim] = useState<CardAnim>('idle');

  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);

  const startYRef = useRef(0);
  const dwellStartRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dwellStartRef.current = Date.now(); }, [current]);

  const commitVote = useCallback(async (type: VoteType, newVotesArr: { outfit: Outfit; vote: VoteType }[]) => {
    const outfit = outfits[current];
    const dwellTimeMs = Date.now() - dwellStartRef.current;
    try {
      await onSubmitFeedback({ userProfile, outfitId: outfit.id, vote: type, dwellTimeMs });
    } catch { /* queue for retry */ }

    const nextIdx = current + 1;
    if (nextIdx >= outfits.length) {
      const loved = newVotesArr.filter(v => v.vote === 'love').length;
      const noped = newVotesArr.filter(v => v.vote === 'nope').length;
      onComplete({
        totalSeen: newVotesArr.length,
        loved,
        noped,
        pointsEarned: loved * 5 + noped * 2,
        votes: newVotesArr.map(v => ({ outfitName: v.outfit.name, vote: v.vote })),
      });
    } else {
      setCurrent(nextIdx);
      setAnimating(false);
    }
  }, [current, outfits, userProfile, onSubmitFeedback, onComplete]);

  /**
   * Trigger the full animation sequence for a vote:
   * 1. Show stamp immediately
   * 2. Current card flies UP (love) or DOWN (nope) — 380ms CSS transition
   * 3. Next card slides UP into view simultaneously
   * 4. After animation, advance current index
   */
  const triggerVote = useCallback((type: VoteType) => {
    if (animating) return;
    setAnimating(true);

    const newVotes = [...votes, { outfit: outfits[current], vote: type }];
    setVotes(newVotes);

    // Show stamp
    setStampVisible(type);
    setTimeout(() => setStampVisible(null), 600);

    // Start exit animation on top card + entrance on next card
    setCardAnim(type === 'love' ? 'exit-up' : 'exit-down');
    setNextAnim('enter');

    // After transition completes, reset state and advance
    setTimeout(() => {
      setCardAnim('idle');
      setNextAnim('idle');
      commitVote(type, newVotes);
    }, 400);
  }, [animating, votes, outfits, current, commitVote]);

  // Touch & mouse drag handlers
  const onDragStart = (clientY: number) => {
    if (animating) return;
    setIsDragging(true);
    startYRef.current = clientY;
    setDragDelta(0);
  };

  const onDragMove = (clientY: number) => {
    if (!isDragging) return;
    const dy = clientY - startYRef.current;
    setDragDelta(dy);
    // Show stamp hint while dragging
    if (dy < -60) setStampVisible('love');       // drag UP = love
    else if (dy > 60) setStampVisible('nope');   // drag DOWN = nope
    else setStampVisible(null);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setStampVisible(null);
    if (dragDelta < -80) triggerVote('love');      // flicked UP → love
    else if (dragDelta > 80) triggerVote('nope');  // flicked DOWN → nope
    else setDragDelta(0);                          // snap back
    setDragDelta(0);
  };

  // Inline drag follow (only while not committed)
  const dragStyle = isDragging && !animating
    ? { transform: `translateY(${dragDelta * 0.35}px)` }
    : {};

  const progress = (current / outfits.length) * 100;

  if (current >= outfits.length) return null;

  const topOutfit  = outfits[current];
  const nextOutfit = outfits[current + 1] ?? null;

  return (
    <div className={styles.phoneFrame}>
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />

      <div className={styles.statusBar}>
        <span className={styles.brandLabel}>KIABI · Style Vote</span>
        <span className={styles.counter}>{current + 1} / {outfits.length}</span>
      </div>

      <div
        ref={containerRef}
        className={styles.reelContainer}
        onMouseDown={e => onDragStart(e.clientY)}
        onMouseMove={e => onDragMove(e.clientY)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={e => onDragStart(e.touches[0].clientY)}
        onTouchMove={e => onDragMove(e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
      >
        {/* Next card — sits below, slides up on enter */}
        {nextOutfit && (
          <div
            key={`next-${nextOutfit.id}`}
            className={`${styles.reel} ${styles.reelNext} ${nextAnim === 'enter' ? styles.reelEnter : ''}`}
            style={{ background: nextOutfit.bgColor }}
          >
            <div className={styles.reelBg}>{nextOutfit.emoji}</div>
            <div className={styles.reelOverlay} />
            <div className={styles.reelContent}>
              <span className={styles.tag}>{nextOutfit.tag}</span>
              <div className={styles.outfitName}>{nextOutfit.name}</div>
              <div className={styles.outfitMeta}>{nextOutfit.description}</div>
            </div>
          </div>
        )}

        {/* Top card — exits up or down */}
        <div
          key={`top-${topOutfit.id}`}
          className={[
            styles.reel,
            styles.reelTop,
            cardAnim === 'exit-up'   ? styles.exitUp   : '',
            cardAnim === 'exit-down' ? styles.exitDown : '',
          ].join(' ')}
          style={{ background: topOutfit.bgColor, ...dragStyle }}
        >
          <div className={styles.reelBg}>{topOutfit.emoji}</div>
          <div className={styles.reelOverlay} />
          <div className={styles.reelContent}>
            <span className={styles.tag}>{topOutfit.tag}</span>
            <div className={styles.outfitName}>{topOutfit.name}</div>
            <div className={styles.outfitMeta}>{topOutfit.description}</div>
          </div>
        </div>

        {/* Stamps */}
        {stampVisible === 'love' && (
          <div className={`${styles.stamp} ${styles.stampLove}`}>LOVE IT ♡</div>
        )}
        {stampVisible === 'nope' && (
          <div className={`${styles.stamp} ${styles.stampNope}`}>NOPE ✕</div>
        )}

        {/* Hint arrows — swipe UP = love, swipe DOWN = nope */}
        <div className={styles.hintArrows}>
          <span className={styles.arrow}>▲</span>
          <span className={styles.arrowLabel}>love</span>
          <span className={styles.arrowLabel} style={{ marginTop: 14 }}>nope</span>
          <span className={styles.arrow}>▼</span>
        </div>

        {/* Side action buttons */}
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${styles.actionLove}`}
            onClick={() => triggerVote('love')}
            title="Love it — swipe up"
            disabled={animating}
          >♡</button>
          <button
            className={`${styles.actionBtn} ${styles.actionNope}`}
            onClick={() => triggerVote('nope')}
            title="Nope — swipe down"
            disabled={animating}
          >✕</button>
        </div>

        {/* Dot indicators */}
        <div className={styles.dots}>
          {outfits.map((_, i) => (
            <div
              key={i}
              className={`${styles.dotIndicator} ${i === current ? styles.dotActive : i < current ? styles.dotDone : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Vote streak bar */}
      <div className={styles.streakBar}>
        <span className={styles.streakItem} style={{ color: '#5DCAA5' }}>♡ {votes.filter(v => v.vote === 'love').length}</span>
        <span className={styles.streakDivider}>·</span>
        <span className={styles.streakItem} style={{ color: '#F09595' }}>✕ {votes.filter(v => v.vote === 'nope').length}</span>
        <span className={styles.streakDivider}>·</span>
        <span className={styles.streakItem} style={{ color: '#FAC775' }}>
          +{votes.filter(v => v.vote === 'love').length * 5 + votes.filter(v => v.vote === 'nope').length * 2} pts
        </span>
      </div>
    </div>
  );
}
