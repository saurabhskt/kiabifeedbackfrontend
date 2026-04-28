import axios from 'axios';
import type {FeedbackPayload, Outfit, SurveySubmission, SurveySummary} from '../types';

const api = axios.create({ baseURL: '/api' });

export const getOutfits = async (): Promise<Outfit[]> => {
  const { data } = await api.get('/outfits');
  return data;
};

export const submitFeedback = async (payload: FeedbackPayload) => {
  const { data } = await api.post('/feedback', payload);
  return data;
};

export const submitBulkFeedback = async (payloads: FeedbackPayload[]) => {
  const { data } = await api.post('/feedback/bulk', { feedbacks: payloads });
  return data;
};

export const submitSurvey = async (submission: SurveySubmission) => {
  try {
    const { data } = await api.post('/survey', submission);
    return data;
  } catch (err: any) {
    // re-throw with response intact so callers can read err.response.status
    throw err;
  }
};

export const getSurveyStats = async () => {
  const { data } = await api.get('/survey/stats');
  return data;
};
export const checkSurveyContact = async (contact: string): Promise<{
  completed: boolean;
  summary?: SurveySummary;
  userName?: string;
}> => {
  try {
    const { data } = await api.get(`/survey/check?contact=${encodeURIComponent(contact)}`);
    return data;
  } catch (err: any) {
    throw err;
  }
};
