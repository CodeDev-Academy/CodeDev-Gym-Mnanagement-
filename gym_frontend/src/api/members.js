import api from './client';

export const getMembers = async (params = {}) => {
  const response = await api.get('members/', { params });
  return response.data;
};

export const getMember = async (id) => {
  const response = await api.get(`members/${id}/`);
  return response.data;
};

export const createMember = async (memberData) => {
  const isFormData = memberData instanceof FormData;
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.post('members/', memberData, { headers });
  return response.data;
};

export const updateMember = async (id, memberData) => {
  const isFormData = memberData instanceof FormData;
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.patch(`members/${id}/`, memberData, { headers });
  return response.data;
};

export const deleteMember = async (id) => {
  const response = await api.delete(`members/${id}/`);
  return response.data;
};
