import { useEffect, useRef } from 'react';
import type { SurveyCard as SurveyCardType } from '../survey/cards';
import styles from './SurveyCard.module.css';

interface Props {
  card: SurveyCardType;
  animClass: string;          // 'exit-up' | 'exit-down' | 'enter-up' | ''
  dragDelta: number;          // live drag offset in px
  stampVisible: 'yes' | 'nope' | null;
  onDragStart: (y: number) => void;
  onDragMove: (y: number) => void;
  onDragEnd: () => void;
}

export default function SurveyCard({
  card, animClass, dragDelta, stampVisible,
  onDragStart, onDragMove, onDragEnd,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Apply live drag transform directly on DOM — avoids re-render jank
  useEffect(() => {
    if (!cardRef.current) return;
    if (animClass) {
      cardRef.current.style.transform = '';
    } else {
      cardRef.current.style.transform = dragDelta ? `translateY(${dragDelta * 0.28}px)` : '';
    }
  }, [dragDelta, animClass]);

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${animClass ? styles[animClass.replace('-', '_')] : ''}`}
      style={{ background: card.bg }}
      onMouseDown={e => onDragStart(e.clientY)}
      onTouchStart={e => onDragStart(e.touches[0].clientY)}
      onMouseMove={e => onDragMove(e.clientY)}
      onTouchMove={e => onDragMove(e.touches[0].clientY)}
      onMouseUp={onDragEnd}
      onTouchEnd={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      <div className={styles.sectionPill} style={{ borderColor: card.sectionColor, color: card.sectionColor }}>
        {card.section.toUpperCase()}
      </div>

      <div className={styles.emoji}>{card.emoji}</div>
      <div className={styles.statement}>{card.statement}</div>

      <div className={styles.hints}>
        <div className={styles.hintYes}>▲ &nbsp;Swipe up — Yes</div>
        <div className={styles.hintNope}>▼ &nbsp;Swipe down — Nope</div>
      </div>

      {stampVisible === 'yes' && (
        <div className={`${styles.stamp} ${styles.stampYes}`}>YES ▲</div>
      )}
      {stampVisible === 'nope' && (
        <div className={`${styles.stamp} ${styles.stampNope}`}>NOPE ▼</div>
      )}
    </div>
  );
}
