import api from './api';

export const getAgents = (params) => {
  return api.get('/ai-agents', { params });
};

export const getAgentById = (id) => {
  return api.get(`/ai-agents/${id}`);
};

export const createAgent = (data) => {
  return api.post('/ai-agents', data);
};

export const updateAgent = (id, data) => {
  return api.put(`/ai-agents/${id}`, data);
};

export const deleteAgent = (id) => {
  return api.delete(`/ai-agents/${id}`);
};

export const testAgentConnection = (id) => {
  return api.post(`/ai-agents/${id}/test`);
};

export const setDefaultAgent = (id) => {
  return api.post(`/ai-agents/${id}/set-default`);
};

export const batchDeleteAgents = (ids) => {
  return api.post('/ai-agents/batch-delete', { ids });
};
