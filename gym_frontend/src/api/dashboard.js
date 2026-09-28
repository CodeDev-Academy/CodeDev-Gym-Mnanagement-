import api from './client';

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats/');
  return response.data;
};

export const getDailySummary = async () => {
  const response = await api.get('/dashboard/daily-summary/');
  return response.data;
};
