import api from './client';

export const getCheckIns = async (params = {}) => {
  const response = await api.get('attendance/', { params });
  return response.data;
};

export const createCheckIn = async (memberId) => {
  const response = await api.post('attendance/', { member: memberId });
  return response.data;
};

export const getTodayStats = async () => {
  const response = await api.get('attendance/today_stats/');
  return response.data;
};
