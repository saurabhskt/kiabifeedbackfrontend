import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SURVEY_CARDS, getNextIndex, deriveIncomeBracket } from '../survey/cards';
import type { SurveyVote } from '../types';
import type { SurveyAnswer, SurveySubmission, SurveySummary, UserProfile } from '../types';
import SurveyCard from '../components/SurveyCard';
import SurveySummaryScreen from './SurveySummary';
import styles from './SurveyFeed.module.css';

interface Props {
  userProfile: UserProfile;
  onSubmit: (submission: SurveySubmission) => Promise<void>;
  onRestart: () => void;
}

type AnimState = 'exit-up' | 'exit-down' | 'enter-up' | 'standby' | '';

export default function SurveyFeed({ userProfile, onSubmit, onRestart }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx]       = useState<number | null>(null);
  const [topAnim, setTopAnim]       = useState<AnimState>('');
  const [nextAnim, setNextAnim]     = useState<AnimState>('standby');
  const [stampVisible, setStampVisible] = useState<'yes' | 'nope' | null>(null);
  const [animating, setAnimating]   = useState(false);
  const [answers, setAnswers]       = useState<SurveyAnswer[]>([]);
  const [skipped, setSkipped]       = useState<string[]>([]);
  const [done, setDone]             = useState(false);
  const [summary, setSummary]       = useState<SurveySummary | null>(null);

  const [submitError, setSubmitError] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<SurveySubmission | null>(null);

  // drag state
  const [dragDelta, setDragDelta]   = useState(0);
  const dragging = useRef(false);
  const startY   = useRef(0);
  const dwellStart = useRef(Date.now());
  const sessionId  = useRef(uuidv4());

  useEffect(() => { dwellStart.current = Date.now(); }, [currentIdx]);

  const showStamp = (type: 'yes' | 'nope') => {
    setStampVisible(type);
    setTimeout(() => setStampVisible(null), 900);
  };
  const handleRetry = async () => {
    if (!pendingSubmission) return;
    setSubmitError(false);
    try {
      await onSubmit(pendingSubmission);
      setPendingSubmission(null);
      const finalSummary = buildSummary(answers, skipped);
      setSummary(finalSummary);
      setDone(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setPendingSubmission(null);
        const finalSummary = buildSummary(answers, skipped);
        setSummary(finalSummary);
        setDone(true);
      } else {
        setSubmitError(true);
      }
    }
  };

  const buildSummary = useCallback((finalAnswers: SurveyAnswer[], finalSkipped: string[]): SurveySummary => {
    const sections = [...new Set(SURVEY_CARDS.map(c => c.section))];
    const sectionBreakdown = sections.map(sec => {
      const secAnswers = finalAnswers.filter(a => a.section === sec);
      const yesCount = secAnswers.filter(a => a.answer === 'yes').length;
      return {
        section: sec,
        answered: secAnswers.length,
        yesRate: secAnswers.length > 0 ? Math.round((yesCount / secAnswers.length) * 100) : 0,
      };
    }).filter(s => s.answered > 0);

    const answerMap: Record<string, SurveyVote> = {};
    finalAnswers.forEach(a => { answerMap[a.cardId] = a.answer; });

    return {
      totalAnswered: finalAnswers.length,
      totalSkipped: finalSkipped.length,
      yesCount: finalAnswers.filter(a => a.answer === 'yes').length,
      nopeCount: finalAnswers.filter(a => a.answer === 'nope').length,
      incomeBracket: deriveIncomeBracket(answerMap),
      sectionBreakdown,
    };
  }, []);

  const commitVote = useCallback(async (vote: SurveyVote) => {
    const card = SURVEY_CARDS[currentIdx];
    const dwellTimeMs = Date.now() - dwellStart.current;

    const newAnswer: SurveyAnswer = {
      cardId: card.id,
      section: card.section,
      statement: card.statement,
      answer: vote,
      dwellTimeMs,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    // Calculate next index (applies branching rules)
    const rawNextIdx = getNextIndex(card.id, vote);

    // Collect skipped card ids (cards between current+1 and rawNextIdx that we're jumping over)
    let newSkipped = [...skipped];
    if (rawNextIdx > currentIdx + 1) {
      const skippedIds = SURVEY_CARDS.slice(currentIdx + 1, rawNextIdx).map(c => c.id);
      newSkipped = [...newSkipped, ...skippedIds];
      setSkipped(newSkipped);
    }

    // Survey complete
    if (rawNextIdx === -1) {
      showStamp(vote);
      setTopAnim(vote === 'yes' ? 'exit-up' : 'exit-down');
      const finalSummary = buildSummary(newAnswers, newSkipped);
      const submission: SurveySubmission = {
        userProfile,
        sessionId: sessionId.current,
        answers: newAnswers,
        skippedCardIds: newSkipped,
        incomeBracket: finalSummary.incomeBracket,
        completedAt: new Date().toISOString(),
      };

      setPendingSubmission(submission);

      try {
        await onSubmit(submission);
        setPendingSubmission(null);
        setSubmitError(false);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 409) {
          // duplicate — treat as success
          setPendingSubmission(null);
          setSubmitError(false);
        } else {
          // real error — show retry
          setSubmitError(true);
          setAnimating(false);
          return; // don't advance to summary yet
        }
      }

      setTimeout(() => { setSummary(finalSummary); setDone(true); }, 420);
      return;
    }

    // Animate transition
    setNextIdx(rawNextIdx);
    showStamp(vote);
    setTopAnim(vote === 'yes' ? 'exit-up' : 'exit-down');
    setNextAnim('standby');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      setNextAnim('enter-up');
    }));

    setTimeout(() => {
      setCurrentIdx(rawNextIdx);
      setNextIdx(null);
      setTopAnim('');
      setNextAnim('standby');
      setAnimating(false);
    }, 400);
  }, [currentIdx, answers, skipped, userProfile, onSubmit, buildSummary]);

  const tryVote = useCallback((vote: SurveyVote) => {
    if (animating) return;
    setAnimating(true);
    commitVote(vote);
  }, [animating, commitVote]);

  // ── Drag handlers ────────────────────────────────────────────────
  const onDragStart = (y: number) => {
    if (animating) return;
    dragging.current = true;
    startY.current = y;
    setDragDelta(0);
  };

  const onDragMove = (y: number) => {
    if (!dragging.current) return;
    const dy = y - startY.current;
    setDragDelta(dy);
    if      (dy < -55) showStamp('yes');
    else if (dy >  55) showStamp('nope');
    else               setStampVisible(null);
  };

  const onDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dy = dragDelta;
    setDragDelta(0);
    setStampVisible(null);
    if      (dy < -80) tryVote('yes');
    else if (dy >  80) tryVote('nope');
  };

  // ── Chrome helpers ───────────────────────────────────────────────
  const totalCards  = SURVEY_CARDS.length;
  const progressPct = Math.round((answers.length / totalCards) * 100);
  const currentCard = SURVEY_CARDS[currentIdx];
  const nextCard    = nextIdx !== null ? SURVEY_CARDS[nextIdx] : null;

  if (done && summary) {
    return <SurveySummaryScreen summary={summary} userProfile={userProfile} onRestart={onRestart} />;
  }

  return (
    <div className={styles.phoneFrame}>
      {/* Progress bar */}
      <div className={styles.progressBar} style={{ width: `${progressPct}%` }} />

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.brand}>KIABI · Sample Sale</span>
        <span className={styles.counter}>{answers.length + 1} / {totalCards}</span>
      </div>

      {/* Side guide */}
      <div className={styles.sideGuide}>
        <span className={styles.sgArrow}>▲</span>
        <span className={styles.sg}>Yes</span>
        <span className={styles.sg} style={{ marginTop: 10 }}>Nope</span>
        <span className={styles.sgArrow}>▼</span>
      </div>

      {/* Reel deck */}
      <div className={styles.deck}>
        {/* Next card (behind, slides up) */}
        {nextCard && (
          <SurveyCard
            key={`next-${nextCard.id}`}
            card={nextCard}
            animClass={nextAnim}
            dragDelta={0}
            stampVisible={null}
            onDragStart={() => {}}
            onDragMove={() => {}}
            onDragEnd={() => {}}
          />
        )}

        {/* Current / top card */}
        <SurveyCard
          key={`top-${currentCard.id}`}
          card={currentCard}
          animClass={topAnim}
          dragDelta={dragDelta}
          stampVisible={stampVisible}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        />
      </div>

      {/* Bottom dot strip */}
      <div className={styles.bottomBar}>
        <div className={styles.dotsRow}>
          {SURVEY_CARDS.map((_, i) => (
            <div
              key={i}
              className={[
                styles.dot,
                i === currentIdx ? styles.dotCurrent : '',
                i < currentIdx   ? styles.dotDone    : '',
                skipped.includes(SURVEY_CARDS[i].id) ? styles.dotSkipped : '',
              ].join(' ')}
            />
          ))}
        </div>
        <div className={styles.sectionLabel}>{currentCard.section}</div>
      </div>
      {submitError && (
          <div className={styles.errorOverlay}>
            <div className={styles.errorBox}>
              <div className={styles.errorIcon}>!</div>
              <div className={styles.errorTitle}>Couldn't save your response</div>
              <div className={styles.errorSub}>Check your connection and try again</div>
              <button className={styles.retryBtn} onClick={handleRetry}>
                Retry
              </button>
              <button className={styles.skipBtn} onClick={() => {
                setSubmitError(false);
                setPendingSubmission(null);
                const finalSummary = buildSummary(answers, skipped);
                setSummary(finalSummary);
                setDone(true);
              }}>
                Skip and finish anyway
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
