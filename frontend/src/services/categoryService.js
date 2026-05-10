import api from './api';

export const getCategories = (params) => {
  return api.get('/categories', { params });
};

export const getSubjects = () => {
  return api.get('/categories/subjects');
};

export const getChapters = (subjectId) => {
  const params = subjectId ? { subjectId } : {};
  return api.get('/categories/chapters', { params });
};

export const getDifficulties = () => {
  return api.get('/categories/difficulties');
};

export const getCategoryById = (id) => {
  return api.get(`/categories/${id}`);
};

export const createCategory = (data) => {
  return api.post('/categories', data);
};

export const updateCategory = (id, data) => {
  return api.put(`/categories/${id}`, data);
};

export const deleteCategory = (id) => {
  return api.delete(`/categories/${id}`);
};