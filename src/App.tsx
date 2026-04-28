import {useState, useEffect} from 'react';
import Onboarding from './pages/Onboarding';
import SurveyFeed from './pages/SurveyFeed';
import SurveySummaryScreen from './pages/SurveySummary';
import AdminDashboard from './pages/AdminDashboard';

import type {UserProfile, SurveySubmission, SurveySummary} from './types';
import {submitComment, submitSurvey} from './api';
import './index.css';

type Stage = 'onboarding' | 'survey' | 'summary';

const SESSION_KEY = 'kiabi_stage';
const PROFILE_KEY = 'kiabi_profile';

function isAdminRoute(): boolean {
    return window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin/');
}

export default function App() {
    const [isAdmin] = useState(isAdminRoute);

    const [stage, setStage] = useState<Stage>(() => {
        const saved = sessionStorage.getItem(SESSION_KEY);
        return (saved as Stage) || 'onboarding';
    });
    const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
        const saved = sessionStorage.getItem(PROFILE_KEY);
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [summary, setSummary] = useState<SurveySummary | null>(null);

    useEffect(() => {
        sessionStorage.setItem(SESSION_KEY, stage);
    }, [stage]);

    useEffect(() => {
        if (userProfile) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));
        else sessionStorage.removeItem(PROFILE_KEY);
    }, [userProfile]);

    const handleRestart = () => {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(PROFILE_KEY);
        setStage('onboarding');
        setUserProfile(null);
        setSummary(null);
    };

    // Admin dashboard at /admin
    if (isAdmin) return <AdminDashboard/>;

    return (
        <>
            {stage === 'onboarding' && (
                <Onboarding onComplete={p => {
                    setUserProfile(p);
                    setStage('survey');
                }}/>
            )}
            {stage === 'survey' && userProfile && (
                <SurveyFeed
                    userProfile={userProfile}
                    onSubmit={async (s: SurveySubmission) => {
                        await submitSurvey(s);
                    }}
                    onComment={async (sessionId, text, audio, mimeType) => {
                        await submitComment(sessionId, text, audio, mimeType);
                    }}
                    onRestart={handleRestart}
                />
            )}
            {stage === 'survey' && !userProfile && (
                <Onboarding onComplete={p => {
                    setUserProfile(p);
                    setStage('survey');
                }}/>
            )}
            {stage === 'summary' && summary && userProfile && (
                <SurveySummaryScreen
                    summary={summary}
                    userProfile={userProfile}
                    onRestart={handleRestart}
                />
            )}
        </>
    );
}
