import api from './api';

export const register = (data) => {
  return api.post('/users/register', data);
};

export const login = (data) => {
  return api.post('/users/login', data);
};

export const getCurrentUser = () => {
  return api.get('/users/me');
};

export const updateProfile = (data) => {
  return api.put('/users/profile', data);
};

export const changePassword = (data) => {
  return api.put('/users/password', data);
};

export const getUsers = (params) => {
  return api.get('/users', { params });
};

export const getUserById = (id) => {
  return api.get(`/users/${id}`);
};

export const updateUser = (id, data) => {
  return api.put(`/users/${id}`, data);
};

export const deleteUser = (id) => {
  return api.delete(`/users/${id}`);
};