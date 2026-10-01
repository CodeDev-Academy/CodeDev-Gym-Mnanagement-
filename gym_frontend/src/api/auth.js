import api from './client';

export const loginUser = async (credentials) => {
  const response = await api.post('auth/login/', credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('auth/me/');
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('auth/profile/');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const isFormData = profileData instanceof FormData;
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.patch('auth/profile/', profileData, { headers });
  return response.data;
};

export const changePassword = async (passwordData) => {
  const response = await api.post('auth/change-password/', passwordData);
  return response.data;
};

export const getStaffList = async () => {
  const response = await api.get('auth/staff/');
  return response.data;
};

export const createStaff = async (staffData) => {
  const response = await api.post('auth/staff/', staffData);
  return response.data;
};

export const resetStaffPassword = async (staffId, passwordData) => {
  const response = await api.post(`auth/staff/${staffId}/reset-password/`, passwordData);
  return response.data;
};

export const toggleStaffStatus = async (staffId) => {
  const response = await api.post(`auth/staff/${staffId}/toggle-status/`);
  return response.data;
};
