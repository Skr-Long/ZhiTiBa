import api from './api';
import { getToken } from '../utils/storage';

export const importQuestionsFromFile = (formData) => {
  return api.post('/import-export/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const exportQuestionsToJSON = async (questionIds) => {
  const response = await api.post('/import-export/export-json', { ids: questionIds }, {
    responseType: 'blob'
  });
  
  if (response.data && response.data.type === 'application/json') {
    const text = await response.data.text();
    const data = JSON.parse(text);
    if (!data.success && data.message) {
      throw new Error(data.message);
    }
  }
  
  return response.data;
};

export const exportQuestionsToExcel = async (questionIds) => {
  const response = await api.post('/import-export/export-excel', { ids: questionIds }, {
    responseType: 'blob'
  });
  
  if (response.data && response.data.type === 'application/json') {
    const text = await response.data.text();
    const data = JSON.parse(text);
    if (!data.success && data.message) {
      throw new Error(data.message);
    }
  }
  
  return response.data;
};
