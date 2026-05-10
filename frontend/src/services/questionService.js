import api from './api';

export const getQuestions = (params) => {
  return api.get('/questions', { params });
};

export const getQuestionById = (id) => {
  return api.get(`/questions/${id}`);
};

export const createQuestion = (data) => {
  return api.post('/questions', data);
};

export const updateQuestion = (id, data) => {
  return api.put(`/questions/${id}`, data);
};

export const deleteQuestion = (id) => {
  return api.delete(`/questions/${id}`);
};

export const getMyQuestions = (params) => {
  return api.get('/questions/my', { params });
};

export const importQuestions = (data) => {
  return api.post('/questions/import', data);
};