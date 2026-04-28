import { useState } from 'react';
import type { UserProfile, Gender, AgeGroup, EmploymentStatus } from '../types';
import { checkSurveyContact } from '../api';
import styles from './Onboarding.module.css';

interface Props {
  onComplete: (profile: UserProfile) => void;
  onAlreadyCompleted: (userName: string, summary: any) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRegex = /^[0-9]{10}$/;

function validateContact(val: string): boolean {
  return emailRegex.test(val) || mobileRegex.test(val);
}

export default function Onboarding({ onComplete, onAlreadyCompleted }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [contact, setContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [checking, setChecking] = useState(false);

  const set = (key: keyof UserProfile, val: string) => {
    setProfile(p => ({ ...p, [key]: val }));
  };

  const next = () => setStep(s => s + 1);

  const handleContactSubmit = async () => {
    setContactError('');
    if (!validateContact(contact.trim())) {
      setContactError('Please enter a valid email or 10-digit mobile number');
      return;
    }
    setChecking(true);
    try {
      const result = await checkSurveyContact(contact.trim());
      if (result.completed && result.summary) {
        onAlreadyCompleted(result.userName ?? profile.name ?? '', result.summary);
        return;
      }
      onComplete({ ...profile, contact: contact.trim() } as UserProfile);
    } catch {
      // if check fails, proceed anyway
      onComplete({ ...profile, contact: contact.trim() } as UserProfile);
    } finally {
      setChecking(false);
    }
  };

  return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.logo}>KIABI</div>
          <div className={styles.tagline}>Sample Sale — Quick Feedback</div>

          <div className={styles.progress}>
            {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`${styles.dot} ${i <= step ? styles.dotActive : ''}`} />
            ))}
          </div>

          {step === 0 && (
              <div className={styles.step}>
                <h2 className={styles.q}>What's your name?</h2>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Your first name"
                    value={profile.name ?? ''}
                    onChange={e => set('name', e.target.value)}
                    autoFocus
                />
                <button
                    className={styles.btn}
                    disabled={!profile.name?.trim()}
                    onClick={next}
                >
                  Continue →
                </button>
              </div>
          )}

          {step === 1 && (
              <div className={styles.step}>
                <h2 className={styles.q}>How do you identify?</h2>
                <div className={styles.chips}>
                  {(['male','female','non_binary','prefer_not_to_say'] as Gender[]).map(g => (
                      <button
                          key={g}
                          className={`${styles.chip} ${profile.gender === g ? styles.chipActive : ''}`}
                          onClick={() => { set('gender', g); setTimeout(next, 200); }}
                      >
                        {{ male:'Man', female:'Woman', non_binary:'Non-binary', prefer_not_to_say:'Prefer not to say' }[g]}
                      </button>
                  ))}
                </div>
              </div>
          )}

          {step === 2 && (
              <div className={styles.step}>
                <h2 className={styles.q}>Your age group?</h2>
                <div className={styles.chips}>
                  {(['13-17','18-24','25-34','35-44','45-54','55+'] as AgeGroup[]).map(a => (
                      <button
                          key={a}
                          className={`${styles.chip} ${profile.ageGroup === a ? styles.chipActive : ''}`}
                          onClick={() => { set('ageGroup', a); setTimeout(next, 200); }}
                      >
                        {a}
                      </button>
                  ))}
                </div>
              </div>
          )}

          {step === 3 && (
              <div className={styles.step}>
                <h2 className={styles.q}>Your lifestyle?</h2>
                <div className={styles.chips}>
                  {(['working','non_working','student','retired'] as EmploymentStatus[]).map(e => (
                      <button
                          key={e}
                          className={`${styles.chip} ${profile.employmentStatus === e ? styles.chipActive : ''}`}
                          onClick={() => { set('employmentStatus', e); setTimeout(next, 200); }}
                      >
                        {{ working:'Working', non_working:'Not working', student:'Student', retired:'Retired' }[e]}
                      </button>
                  ))}
                </div>
              </div>
          )}

          {step === 4 && (
              <div className={styles.step}>
                <h2 className={styles.q}>Your email or mobile?</h2>
                <p className={styles.hint}>So we know you've already shared feedback next time</p>
                <input
                    className={`${styles.input} ${contactError ? styles.inputError : ''}`}
                    type="text"
                    placeholder="email@example.com or 9876543210"
                    value={contact}
                    onChange={e => { setContact(e.target.value); setContactError(''); }}
                    autoFocus
                />
                {contactError && (
                    <div className={styles.errorMsg}>{contactError}</div>
                )}
                <button
                    className={styles.btn}
                    disabled={!contact.trim() || checking}
                    onClick={handleContactSubmit}
                >
                  {checking ? 'Checking...' : 'Start survey ✦'}
                </button>
              </div>
          )}
        </div>
      </div>
  );
}
