import api from './client';

export const getPayments = async (params = {}) => {
  const response = await api.get('payments/', { params });
  return response.data;
};

export const recordPayment = async (paymentData) => {
  const response = await api.post('payments/', paymentData);
  return response.data;
};

export const getPaymentSummary = async () => {
  const response = await api.get('payments/summary/');
  return response.data;
};
