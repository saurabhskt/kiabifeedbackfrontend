import type { SessionSummary, UserProfile } from '../types';
import styles from './Summary.module.css';

interface Props {
  summary: SessionSummary;
  userProfile: UserProfile;
  onRestart: () => void;
}

export default function Summary({ summary, userProfile, onRestart }: Props) {
  const lovePercent = summary.totalSeen > 0
    ? Math.round((summary.loved / summary.totalSeen) * 100)
    : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>KIABI</div>

        <div className={styles.heroIcon}>✓</div>
        <h2 className={styles.title}>Thanks, {userProfile.name}!</h2>
        <p className={styles.sub}>Your style vote is shaping our next collection.</p>

        <div className={styles.ptsTag}>+{summary.pointsEarned} loyalty points earned</div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{summary.totalSeen}</div>
            <div className={styles.statLbl}>Outfits seen</div>
          </div>
          <div className={styles.statCard} style={{ borderColor: '#5DCAA5' }}>
            <div className={styles.statVal} style={{ color: '#1D9E75' }}>♡ {summary.loved}</div>
            <div className={styles.statLbl}>Loved</div>
          </div>
          <div className={styles.statCard} style={{ borderColor: '#F09595' }}>
            <div className={styles.statVal} style={{ color: '#A32D2D' }}>✕ {summary.noped}</div>
            <div className={styles.statLbl}>Noped</div>
          </div>
        </div>

        <div className={styles.barWrap}>
          <div className={styles.barLabel}>
            <span style={{ color: '#1D9E75' }}>Love rate</span>
            <span>{lovePercent}%</span>
          </div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${lovePercent}%` }} />
          </div>
        </div>

        <div className={styles.voteList}>
          <div className={styles.voteListTitle}>Your votes</div>
          {summary.votes.map((v, i) => (
            <div key={i} className={styles.voteRow}>
              <span className={styles.voteOutfit}>{v.outfitName}</span>
              <span className={`${styles.voteBadge} ${v.vote === 'love' ? styles.voteLove : styles.voteNope}`}>
                {v.vote === 'love' ? '♡ Love' : '✕ Nope'}
              </span>
            </div>
          ))}
        </div>

        <button className={styles.restartBtn} onClick={onRestart}>
          Rate more outfits ↺
        </button>
      </div>
    </div>
  );
}
