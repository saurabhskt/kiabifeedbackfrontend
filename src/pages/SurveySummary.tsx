import type { SurveySummary, UserProfile } from '../types';
import styles from './SurveySummary.module.css';

interface Props {
  summary: SurveySummary;
  userProfile: UserProfile;
  onRestart: () => void;
}

export default function SurveySummaryScreen({ summary, userProfile, onRestart }: Props) {
  return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.logo}>KIABI</div>

          <div className={styles.heroIcon}>✓</div>
          <h2 className={styles.title}>Thanks, {userProfile.name}!</h2>
          <p className={styles.sub}>
            Your feedback helps shape KIABI India's next collection and sale experience.
          </p>

          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statNum}>{summary.totalAnswered}</div>
              <div className={styles.statLbl}>Answered</div>
            </div>
            <div className={styles.statBox} style={{ borderColor: '#5DCAA5' }}>
              <div className={styles.statNum} style={{ color: '#1D9E75' }}>▲ {summary.yesCount}</div>
              <div className={styles.statLbl}>Yes votes</div>
            </div>
            <div className={styles.statBox} style={{ borderColor: '#F09595' }}>
              <div className={styles.statNum} style={{ color: '#A32D2D' }}>▼ {summary.nopeCount}</div>
              <div className={styles.statLbl}>Nope votes</div>
            </div>
          </div>

          <button className={styles.restartBtn} onClick={onRestart}>
            Done
          </button>
        </div>
      </div>
  );
}
