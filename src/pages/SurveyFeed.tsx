import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SURVEY_CARDS, getNextIndex, deriveIncomeBracket } from '../survey/cards';
import type { SurveyVote } from '../types';
import type { SurveyAnswer, SurveySubmission, SurveySummary, UserProfile } from '../types';
import SurveyCard from '../components/SurveyCard';
import SurveySummaryScreen from './SurveySummary';
import styles from './SurveyFeed.module.css';
import CommentScreen from "./CommentScreen.tsx";

interface Props {
  userProfile: UserProfile;
  onSubmit: (submission: SurveySubmission) => Promise<void>;
  onComment: (sessionId: string, text: string, audio: Blob | null, mimeType: string) => Promise<void>;
  onRestart: () => void;
}

type AnimState = 'exit-up' | 'exit-down' | 'exit-left' | 'enter-right' | 'enter-up' | 'standby' | '';

export default function SurveyFeed({ userProfile, onSubmit, onComment, onRestart }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx]       = useState<number | null>(null);
  const [topAnim, setTopAnim]       = useState<AnimState>('');
  const [nextAnim, setNextAnim]     = useState<AnimState>('standby');
  const [stampVisible, setStampVisible] = useState<'yes' | 'nope' | 'back' | null>(null);
  const [animating, setAnimating]   = useState(false);
  const [answers, setAnswers]       = useState<SurveyAnswer[]>([]);
  const [done, setDone]             = useState(false);
  const [summary, setSummary]       = useState<SurveySummary | null>(null);

  const [submitError, setSubmitError]           = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<SurveySubmission | null>(null);

  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const dragging   = useRef(false);
  const startY     = useRef(0);
  const startX     = useRef(0);
  const dwellStart = useRef(Date.now());
  const sessionId  = useRef(uuidv4());
  const [commenting, setCommenting] = useState(false);

  useEffect(() => { dwellStart.current = Date.now(); }, [currentIdx]);

  const showStamp = (type: 'yes' | 'nope' | 'back') => {
    setStampVisible(type);
    setTimeout(() => setStampVisible(null), 900);
  };

  const goBack = useCallback(() => {
    if (animating || currentIdx === 0 || answers.length === 0) return;
    setAnimating(true);
    const prevAnswer = answers[answers.length - 1];
    const prevIdx = SURVEY_CARDS.findIndex(c => c.id === prevAnswer.cardId);
    if (prevIdx === -1) { setAnimating(false); return; }
    setAnswers(ans => ans.slice(0, -1));
    setNextIdx(prevIdx);
    setNextAnim('standby');
    setTopAnim('exit-left');
    requestAnimationFrame(() => requestAnimationFrame(() => { setNextAnim('enter-right'); }));
    setTimeout(() => {
      setCurrentIdx(prevIdx);
      setNextIdx(null);
      setTopAnim('');
      setNextAnim('standby');
      setAnimating(false);
    }, 400);
  }, [animating, currentIdx, answers]);

  const buildSummary = useCallback((finalAnswers: SurveyAnswer[]): SurveySummary => {
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
    const answerMap: Record<string, string> = {};
    finalAnswers.forEach(a => { answerMap[a.cardId] = a.answer as string; });
    return {
      totalAnswered: finalAnswers.length,
      yesCount: finalAnswers.filter(a => a.answer === 'yes').length,
      nopeCount: finalAnswers.filter(a => a.answer === 'nope').length,
      incomeBracket: deriveIncomeBracket(answerMap),
      sectionBreakdown,
    };
  }, []);

  const handleRetry = async () => {
    if (!pendingSubmission) return;
    setSubmitError(false);
    try {
      await onSubmit(pendingSubmission);
      setPendingSubmission(null);
      setSummary(buildSummary(answers));
      setCommenting(true);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setPendingSubmission(null);
        setSummary(buildSummary(answers));
        setCommenting(true);
      } else {
        setSubmitError(true);
      }
    }
  };

  const commitVote = useCallback(async (vote: SurveyVote) => {
    const card = SURVEY_CARDS[currentIdx];
    const newAnswers = [...answers, {
      cardId: card.id, section: card.section,
      statement: card.statement, answer: vote,
      dwellTimeMs: Date.now() - dwellStart.current,
    }];
    setAnswers(newAnswers);

    const rawNextIdx = getNextIndex(card.id);

    if (rawNextIdx === -1) {
      showStamp(vote);
      setTopAnim(vote === 'yes' ? 'exit-up' : 'exit-down');
      const finalSummary = buildSummary(newAnswers);
      const submission: SurveySubmission = {
        userProfile, sessionId: sessionId.current,
        answers: newAnswers, incomeBracket: finalSummary.incomeBracket,
        completedAt: new Date().toISOString(),
      };
      setPendingSubmission(submission);
      try {
        await onSubmit(submission);
        setPendingSubmission(null);
      } catch (err: any) {
        if (err?.response?.status === 409) { setPendingSubmission(null); }
        else { setSubmitError(true); setAnimating(false); return; }
      }
      setTimeout(() => { setSummary(finalSummary); setCommenting(true); }, 420);
      return;
    }

    setNextIdx(rawNextIdx);
    showStamp(vote);
    setTopAnim(vote === 'yes' ? 'exit-up' : 'exit-down');
    setNextAnim('standby');
    requestAnimationFrame(() => requestAnimationFrame(() => { setNextAnim('enter-up'); }));
    setTimeout(() => {
      setCurrentIdx(rawNextIdx); setNextIdx(null);
      setTopAnim(''); setNextAnim('standby'); setAnimating(false);
    }, 400);
  }, [currentIdx, answers, userProfile, onSubmit, buildSummary]);

  const tryVote = useCallback((vote: SurveyVote) => {
    if (animating) return;
    setAnimating(true);
    commitVote(vote);
  }, [animating, commitVote]);

  const handleChoiceSubmit = useCallback((value: string) => {
    if (animating) return;
    setAnimating(true);
    const card = SURVEY_CARDS[currentIdx];
    const newAnswers = [...answers, {
      cardId: card.id, section: card.section,
      statement: card.statement, answer: value,
      dwellTimeMs: Date.now() - dwellStart.current,
    }];
    setAnswers(newAnswers);

    const rawNextIdx = getNextIndex(card.id);

    if (rawNextIdx === -1) {
      const finalSummary = buildSummary(newAnswers);
      const submission: SurveySubmission = {
        userProfile, sessionId: sessionId.current,
        answers: newAnswers, incomeBracket: finalSummary.incomeBracket,
        completedAt: new Date().toISOString(),
      };
      setPendingSubmission(submission);
      onSubmit(submission)
          .then(() => { setPendingSubmission(null); })
          .catch((err: any) => {
            if (err?.response?.status === 409) { setPendingSubmission(null); }
            else { setSubmitError(true); setAnimating(false); return; }
          });
      setTopAnim('exit-up');
      setTimeout(() => { setSummary(finalSummary); setDone(true); }, 420);
      return;
    }

    setNextIdx(rawNextIdx);
    setTopAnim('exit-up');
    setNextAnim('standby');
    requestAnimationFrame(() => requestAnimationFrame(() => { setNextAnim('enter-up'); }));
    setTimeout(() => {
      setCurrentIdx(rawNextIdx); setNextIdx(null);
      setTopAnim(''); setNextAnim('standby'); setAnimating(false);
    }, 400);
  }, [animating, currentIdx, answers, userProfile, onSubmit, buildSummary]);

  const onDragStart = (x: number, y: number) => {
    if (animating) return;
    dragging.current = true; startY.current = y; startX.current = x;
    setDragDeltaY(0); setDragDeltaX(0);
  };
  const onDragMove = (x: number, y: number) => {
    if (!dragging.current) return;
    const dy = y - startY.current; const dx = x - startX.current;
    setDragDeltaY(dy); setDragDeltaX(dx);
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -55 && canGoBack) showStamp('back'); else setStampVisible(null);
    } else {
      if (dy < -55) showStamp('yes'); else if (dy > 55) showStamp('nope'); else setStampVisible(null);
    }
  };
  const onDragEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dy = dragDeltaY; const dx = dragDeltaX;
    setDragDeltaY(0); setDragDeltaX(0); setStampVisible(null);
    if (Math.abs(dx) > Math.abs(dy)) { if (dx < -80 && canGoBack) goBack(); }
    else { if (dy < -80) tryVote('yes'); else if (dy > 80) tryVote('nope'); }
  };

  const totalCards  = SURVEY_CARDS.length;
  const progressPct = Math.round((answers.length / totalCards) * 100);
  const currentCard = SURVEY_CARDS[currentIdx];
  const nextCard    = nextIdx !== null ? SURVEY_CARDS[nextIdx] : null;
  const canGoBack   = currentIdx > 0 && answers.length > 0;
  const isBinary    = !currentCard.type || currentCard.type === 'binary';

  if (commenting && summary) {
    return (
        <CommentScreen
            sessionId={sessionId.current}
            onSubmit={async (text, audioBlob, mimeType) => {
              await onComment(sessionId.current, text, audioBlob, mimeType);
              setCommenting(false); setDone(true);
            }}
            onSkip={() => { setCommenting(false); setDone(true); }}
        />
    );
  }
  if (done && summary) {
    return <SurveySummaryScreen summary={summary} userProfile={userProfile} onRestart={onRestart} />;
  }

  return (
      <div className={styles.phoneFrame}>
        <div className={styles.progressBar} style={{ width: `${progressPct}%` }} />
        <div className={styles.statusBar}>
          <span className={styles.brand}>KIABI · Sample Sale</span>
          <span className={styles.counter}>{answers.length + 1} / {totalCards}</span>
        </div>
        <div className={styles.sideGuide}>
          <span className={styles.sgArrow}>▲</span>
          <span className={styles.sg}>Yes</span>
          <span className={styles.sg} style={{ marginTop: 10 }}>Nope</span>
          <span className={styles.sgArrow}>▼</span>
        </div>
        {canGoBack && isBinary && (
            <div className={styles.backGuide}>
              <span className={styles.sgArrow}>◀</span>
              <span className={styles.sg}>Back</span>
            </div>
        )}
        <div className={styles.deck}>
          {nextCard && (
              <SurveyCard
                  key={`next-${nextCard.id}`} card={nextCard}
                  animClass={nextAnim} dragDeltaX={0} dragDeltaY={0}
                  stampVisible={null} canGoBack={false}
                  onDragStart={() => {}} onDragMove={() => {}} onDragEnd={() => {}}
                  onChoiceSubmit={handleChoiceSubmit} onBack={goBack}
              />
          )}
          <SurveyCard
              key={`top-${currentCard.id}`} card={currentCard}
              animClass={topAnim} dragDeltaX={dragDeltaX} dragDeltaY={dragDeltaY}
              stampVisible={stampVisible} canGoBack={canGoBack}
              onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}
              onChoiceSubmit={handleChoiceSubmit} onBack={goBack}
          />
        </div>
        <div className={styles.bottomBar}>
          <div className={styles.dotsRow}>
            {SURVEY_CARDS.map((_, i) => (
                <div key={i} className={[
                  styles.dot,
                  i === currentIdx ? styles.dotCurrent : '',
                  i < currentIdx   ? styles.dotDone    : '',
                ].join(' ')} />
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
                <button className={styles.retryBtn} onClick={handleRetry}>Retry</button>
                <button className={styles.skipBtn} onClick={() => {
                  setSubmitError(false); setPendingSubmission(null);
                  const s = buildSummary(answers); setSummary(s); setDone(true);
                }}>Skip and finish anyway</button>
              </div>
            </div>
        )}
      </div>
  );
}
