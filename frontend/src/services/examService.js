import api from './api';

export const getExams = (params) => {
  return api.get('/exams', { params });
};

export const getExamById = (id) => {
  return api.get(`/exams/${id}`);
};

export const createExam = (data) => {
  return api.post('/exams', data);
};

export const updateExam = (id, data) => {
  return api.put(`/exams/${id}`, data);
};

export const deleteExam = (id) => {
  return api.delete(`/exams/${id}`);
};

export const publishExam = (id) => {
  return api.post(`/exams/${id}/publish`);
};

export const unpublishExam = (id) => {
  return api.post(`/exams/${id}/unpublish`);
};

export const generateExamByChapters = (data) => {
  return api.post('/exams/generate-by-chapters', data);
};

export const generateExamByAI = (data) => {
  return api.post('/exams/generate-by-ai', data);
};

export const batchDeleteExams = (ids) => {
  return api.post('/exams/batch-delete', { ids });
};
