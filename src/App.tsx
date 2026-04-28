import { useState } from 'react';
import Onboarding from './pages/Onboarding';
import SurveyFeed from './pages/SurveyFeed';
import SurveySummaryScreen from './pages/SurveySummary';
import AlreadyCompleted from './pages/AlreadyCompleted';
import type { UserProfile, SurveySubmission, SurveySummary } from './types';
import { submitSurvey } from './api';
import './index.css';

type Stage = 'onboarding' | 'survey' | 'summary' | 'already-completed';

export default function App() {
  const [stage, setStage]             = useState<Stage>('onboarding');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary]         = useState<SurveySummary | null>(null);
  const [prevUserName, setPrevUserName] = useState('');

  const handleRestart = () => {
    setStage('onboarding');
    setUserProfile(null);
    setSummary(null);
  };

  const handleAlreadyCompleted = (userName: string, prevSummary: SurveySummary) => {
    setPrevUserName(userName);
    setSummary(prevSummary);
    setStage('already-completed');
  };

  return (
      <>
        {stage === 'onboarding' && (
            <Onboarding
                onComplete={p => { setUserProfile(p); setStage('survey'); }}
                onAlreadyCompleted={handleAlreadyCompleted}
            />
        )}
        {stage === 'survey' && userProfile && (
            <SurveyFeed
                userProfile={userProfile}
                onSubmit={async (s: SurveySubmission) => {
                  await submitSurvey(s);
                }}
                onRestart={handleRestart}
            />
        )}
        {stage === 'summary' && summary && userProfile && (
            <SurveySummaryScreen
                summary={summary}
                userProfile={userProfile}
                onRestart={handleRestart}
            />
        )}
        {stage === 'already-completed' && summary && (
            <AlreadyCompleted
                userName={prevUserName}
                summary={summary}
            />
        )}
      </>
  );
}
