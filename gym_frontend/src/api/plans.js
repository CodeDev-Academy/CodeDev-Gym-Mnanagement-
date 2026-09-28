import api from './client';

export const getPlans = async (params = {}) => {
  const response = await api.get('plans/', { params });
  return response.data;
};

export const createPlan = async (planData) => {
  const response = await api.post('plans/', planData);
  return response.data;
};

export const updatePlan = async (id, planData) => {
  const response = await api.patch(`plans/${id}/`, planData);
  return response.data;
};

export const deletePlan = async (id) => {
  const response = await api.delete(`plans/${id}/`);
  return response.data;
};
