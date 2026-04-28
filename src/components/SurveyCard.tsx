// SurveyCard.tsx
import { useEffect, useRef, useState } from 'react';
import type { SurveyCard as SurveyCardType } from '../survey/cards';
import styles from './SurveyCard.module.css';

interface Props {
  card: SurveyCardType;
  animClass: string;
  dragDeltaX: number;
  dragDeltaY: number;
  stampVisible: 'yes' | 'nope' | 'back' | null;
  canGoBack: boolean;
  onDragStart: (x: number, y: number) => void;
  onDragMove:  (x: number, y: number) => void;
  onDragEnd:   () => void;
  onChoiceSubmit?: (value: string) => void;
  onBack?: () => void;
}

export default function SurveyCard({
                                     card, animClass, dragDeltaX, dragDeltaY, stampVisible,
                                     canGoBack, onDragStart, onDragMove, onDragEnd,
                                     onChoiceSubmit, onBack,
                                   }: Props) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const cardType = card.type ?? 'binary';

  const [selected, setSelected]   = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');

  useEffect(() => { setSelected([]); setOtherText(''); }, [card.id]);

  useEffect(() => {
    if (!cardRef.current) return;
    if (cardType !== 'binary') { cardRef.current.style.transform = ''; return; }
    if (animClass)              { cardRef.current.style.transform = ''; return; }
    const absX = Math.abs(dragDeltaX), absY = Math.abs(dragDeltaY);
    if (absX > absY && absX > 5)
      cardRef.current.style.transform = `translateX(${dragDeltaX * 0.28}px)`;
    else if (absY > 5)
      cardRef.current.style.transform = `translateY(${dragDeltaY * 0.28}px)`;
    else
      cardRef.current.style.transform = '';
  }, [dragDeltaX, dragDeltaY, animClass, cardType]);

  const handleOptionToggle = (value: string) => {
    if (card.multiSelect) {
      const max = card.id === 'st1' ? 2 : Infinity;
      if (selected.includes(value)) setSelected(s => s.filter(v => v !== value));
      else if (selected.length < max) setSelected(s => [...s, value]);
    } else {
      setSelected([value]);
    }
  };

  const handleChoiceConfirm = () => {
    if (selected.length === 0) return;
    const hasOther = selected.includes('other');
    // Keep all non-other values as-is
    const parts = selected.filter(v => v !== 'other');
    if (hasOther) {
      if (otherText.trim()) {
        // "other:<typed text>" — backend can parse the prefix to split value from comment
        parts.push(`other:${otherText.trim()}`);
      } else {
        // Other ticked but nothing typed — only block if no other selections too
        if (parts.length === 0) return;
        parts.push('other');
      }
    }
    onChoiceSubmit?.(parts.join(','));
  };

  const handleScaleSelect = (val: number) => onChoiceSubmit?.(String(val));

  const backBtn = canGoBack ? (
      <button className={styles.backBtn} onClick={onBack} aria-label="Go back">◀ Back</button>
  ) : null;

  // ── BINARY ───────────────────────────────────────────────────────
  if (cardType === 'binary') {
    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${animClass ? styles[animClass.replace(/-/g, '_')] : ''}`}
            style={{ background: card.bg }}
            onMouseDown={e  => onDragStart(e.clientX, e.clientY)}
            onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onMouseMove={e  => onDragMove(e.clientX, e.clientY)}
            onTouchMove={e  => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onMouseUp={onDragEnd} onTouchEnd={onDragEnd} onMouseLeave={onDragEnd}
        >
          <div className={styles.sectionPill} style={{ borderColor: card.sectionColor, color: card.sectionColor }}>
            {card.section.toUpperCase()}
          </div>
          <div className={styles.emoji}>{card.emoji}</div>
          <div className={styles.statement}>{card.statement}</div>
          <div className={styles.hints}>
            <div className={styles.hintYes}>▲ &nbsp;Swipe up — Yes</div>
            <div className={styles.hintNope}>▼ &nbsp;Swipe down — Nope</div>
            {canGoBack && <div className={styles.hintBack}>◀ &nbsp;Swipe left — Go back</div>}
          </div>
          {stampVisible === 'yes'  && <div className={`${styles.stamp} ${styles.stampYes}`}>YES ▲</div>}
          {stampVisible === 'nope' && <div className={`${styles.stamp} ${styles.stampNope}`}>NOPE ▼</div>}
          {stampVisible === 'back' && <div className={`${styles.stamp} ${styles.stampBack}`}>◀ BACK</div>}
        </div>
    );
  }

  // ── CHOICE ───────────────────────────────────────────────────────
  if (cardType === 'choice') {
    const hasOtherSelected = selected.includes('other');
    const canConfirm = selected.length > 0 && (
        !selected.includes('other') ||
        selected.filter(v => v !== 'other').length > 0 ||
        otherText.trim().length > 0
    );
    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${styles.choiceCard} ${animClass ? styles[animClass.replace(/-/g, '_')] : ''}`}
            style={{ background: card.bg }}
        >
          {backBtn}
          <div className={styles.sectionPill} style={{ borderColor: card.sectionColor, color: card.sectionColor }}>
            {card.section.toUpperCase()}
          </div>
          <div className={styles.emoji}>{card.emoji}</div>
          <div className={styles.statement}>{card.statement}</div>
          <div className={styles.optionsList}>
            {card.options!.map(opt => (
                <div key={opt.value}>
                  <button
                      className={`${styles.optionBtn} ${selected.includes(opt.value) ? styles.optionBtnActive : ''}`}
                      onClick={() => handleOptionToggle(opt.value)}
                  >
                    <span className={styles.optionCheck}>{selected.includes(opt.value) ? '✓' : ''}</span>
                    {opt.label}
                  </button>
                  {opt.isOther && hasOtherSelected && (
                      <input
                          className={styles.otherInput}
                          type="text" placeholder="Please specify…"
                          value={otherText}
                          onChange={e => setOtherText(e.target.value)}
                          onClick={e => e.stopPropagation()}
                      />
                  )}
                </div>
            ))}
          </div>
          <button className={styles.confirmBtn} disabled={!canConfirm} onClick={handleChoiceConfirm}>
            Confirm →
          </button>
        </div>
    );
  }

  // ── SCALE ────────────────────────────────────────────────────────
  if (cardType === 'scale') {
    const nums: number[] = [];
    for (let i = card.scaleMin!; i <= card.scaleMax!; i++) nums.push(i);
    const isLarge = nums.length > 6;
    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${styles.scaleCard} ${animClass ? styles[animClass.replace(/-/g, '_')] : ''}`}
            style={{ background: card.bg }}
        >
          {backBtn}
          <div className={styles.sectionPill} style={{ borderColor: card.sectionColor, color: card.sectionColor }}>
            {card.section.toUpperCase()}
          </div>
          <div className={styles.emoji}>{card.emoji}</div>
          <div className={styles.statement}>{card.statement}</div>
          <div className={`${styles.scaleRow} ${isLarge ? styles.scaleRowLarge : ''}`}>
            {nums.map(n => (
                <button key={n} className={styles.scaleBtn} onClick={() => handleScaleSelect(n)}>{n}</button>
            ))}
          </div>
          {card.scaleLabels && (
              <div className={styles.scaleLabels}>
                <span>{card.scaleLabels[0]}</span><span>{card.scaleLabels[1]}</span>
              </div>
          )}
        </div>
    );
  }

  return null;
}
