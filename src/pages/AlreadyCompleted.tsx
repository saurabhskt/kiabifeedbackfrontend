import type { SurveySummary } from '../types';
import styles from './AlreadyCompleted.module.css';

interface Props {
    userName: string;
    summary: SurveySummary;
}

export default function AlreadyCompleted({ userName, summary }: Props) {
    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <div className={styles.logo}>KIABI</div>

                <div className={styles.heroIcon}>✓</div>
                <h2 className={styles.title}>Already done, {userName}!</h2>
                <p className={styles.sub}>
                    You've already shared your feedback with us. We really appreciate it — see you at the next KIABI sale!
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

                {summary.totalSkipped > 0 && (
                    <div className={styles.skippedNote}>
                        {summary.totalSkipped} questions were auto-skipped based on your answers
                    </div>
                )}
            </div>
        </div>
    );
}
