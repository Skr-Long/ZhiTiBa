import api from './api';

export const startExam = (examId, assignmentId) => {
  return api.post('/answers/start', { examId, assignmentId });
};

export const saveAnswer = (recordId, questionId, userAnswer, timeSpent) => {
  return api.post('/answers/save', { recordId, questionId, userAnswer, timeSpent });
};

export const submitExam = (recordId, answers) => {
  return api.post('/answers/submit', { recordId, answers });
};

export const getAnswerRecord = (id) => {
  return api.get(`/answers/${id}`);
};

export const getMyRecords = (params) => {
  return api.get('/answers/my', { params });
};

export const getExamRecords = (examId, params) => {
  return api.get(`/answers/exam/${examId}`, { params });
};

export const getMyStats = () => {
  return api.get('/answers/my-stats');
};

export const gradeAnswer = (recordId, questionId, score, comment) => {
  return api.post('/answers/grade', { recordId, questionId, score, comment });
};
