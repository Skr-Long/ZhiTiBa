import api from './api';

export const importQuestionsFromFile = (formData) => {
  return api.post('/import-export/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const exportQuestionsToJSON = (questionIds) => {
  return api.post('/import-export/export-json', { ids: questionIds }, {
    responseType: 'blob'
  });
};

export const exportQuestionsToExcel = (questionIds) => {
  return api.post('/import-export/export-excel', { ids: questionIds }, {
    responseType: 'blob'
  });
};
