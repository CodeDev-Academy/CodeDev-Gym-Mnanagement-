import api from './client';

export const getSubscriptions = async (params = {}) => {
  const response = await api.get('subscriptions/', { params });
  return response.data;
};

export const assignPlan = async (subscriptionData) => {
  const response = await api.post('subscriptions/', subscriptionData);
  return response.data;
};
