import { useState, useRef } from 'react';
import styles from './CommentScreen.module.css';

interface Props {
    sessionId: string;
    onSubmit: (text: string, audioBlob: Blob | null, mimeType: string) => Promise<void>;
    onSkip: () => void;
}

type RecordState = 'idle' | 'recording' | 'recorded';

export default function CommentScreen({ onSubmit, onSkip }: Props) {
    const [text, setText]               = useState('');
    const [recordState, setRecordState] = useState<RecordState>('idle');
    const [audioBlob, setAudioBlob]     = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl]       = useState<string | null>(null);
    const [mimeType, setMimeType]       = useState('audio/webm');
    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState('');
    const [bars, setBars]               = useState<number[]>(Array(20).fill(4));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef        = useRef<Blob[]>([]);
    const animFrameRef     = useRef<number | null>(null);
    const analyserRef      = useRef<AnalyserNode | null>(null);

    const animateBars = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const slice = Math.floor(data.length / 20);
        const newBars = Array.from({ length: 20 }, (_, i) => {
            const val = data[i * slice] / 255;
            return Math.max(4, Math.round(val * 40));
        });
        setBars(newBars);
        animFrameRef.current = requestAnimationFrame(animateBars);
    };

    const startRecording = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up analyser for waveform animation
            const ctx      = new AudioContext();
            const source   = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mime = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';
            setMimeType(mime);

            const recorder = new MediaRecorder(stream, { mimeType: mime });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = e => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mime });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setRecordState('recorded');
                stream.getTracks().forEach(t => t.stop());
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                setBars(Array(20).fill(4));
            };

            recorder.start();
            setRecordState('recording');
            animFrameRef.current = requestAnimationFrame(animateBars);
        } catch {
            setError('Microphone access denied. Please allow microphone and try again.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
    };

    const reRecord = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordState('idle');
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');

        // if still recording, stop it first then wait for onstop to fire
        if (recordState === 'recording' && mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
                const mime = mimeType;
                const blob = new Blob(chunksRef.current, { type: mime });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setRecordState('recorded');
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                setBars(Array(20).fill(4));

                // now submit with the audio
                onSubmit(text, blob, mime).catch(() => {
                    setError('Failed to save. Please try again.');
                    setSubmitting(false);
                });
            };
            mediaRecorderRef.current.stop();
            return; // wait for onstop to trigger the actual submit
        }

        // not recording — submit directly
        try {
            await onSubmit(text, audioBlob, mimeType);
        } catch {
            setError('Failed to save. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <span className={styles.brand}>KIABI · Sample Sale</span>
                <button className={styles.skipBtn} onClick={onSkip}>Skip</button>
            </div>

            <div className={styles.content}>
                <div className={styles.emoji}>💬</div>
                <h2 className={styles.title}>Anything else to add?</h2>
                <p className={styles.sub}>Optional — type a comment, record a voice note, or both</p>

                {/* Text area */}
                <textarea
                    className={styles.textarea}
                    placeholder="Type your comment here..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={3}
                />

                {/* Audio recorder */}
                <div className={styles.recorderBox}>
                    <div className={styles.recorderLabel}>Voice note</div>

                    {/* Waveform bars — only shown while recording */}
                    {recordState === 'recording' && (
                        <div className={styles.waveform}>
                            {bars.map((h, i) => (
                                <div key={i} className={styles.bar} style={{ height: h }} />
                            ))}
                        </div>
                    )}

                    {/* Playback — shown after recording */}
                    {recordState === 'recorded' && audioUrl && (
                        <audio className={styles.audio} src={audioUrl} controls />
                    )}

                    <div className={styles.recorderActions}>
                        {recordState === 'idle' && (
                            <button className={styles.recordBtn} onClick={startRecording}>
                                🎙 Start recording
                            </button>
                        )}
                        {recordState === 'recording' && (
                            <button className={`${styles.recordBtn} ${styles.recordingActive}`} onClick={stopRecording}>
                                ⏹ Stop recording
                            </button>
                        )}
                        {recordState === 'recorded' && (
                            <button className={styles.reRecordBtn} onClick={reRecord}>
                                ↺ Re-record
                            </button>
                        )}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                </div>

                {/* Submit */}
                <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Saving...' : 'Submit feedback'}
                </button>

                <button className={styles.skipLink} onClick={onSkip}>
                    Skip this step
                </button>
            </div>
        </div>
    );
}
