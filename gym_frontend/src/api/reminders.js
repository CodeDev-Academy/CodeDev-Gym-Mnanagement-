import api from './client';

export const getPendingReminders = async () => {
  const response = await api.get('reminders/pending/');
  return response.data;
};

export const markRemindersSent = async (payload) => {
  const response = await api.post('reminders/mark-sent/', payload);
  return response.data;
};

export const getReminderTemplates = async () => {
  const response = await api.get('reminders/templates/');
  return response.data;
};

export const updateReminderTemplate = async (templateId, data) => {
  const response = await api.patch(`reminders/templates/${templateId}/`, data);
  return response.data;
};
