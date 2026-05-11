const express = require('express');
const { protect } = require('../middleware/auth');
const {
  startExam,
  saveAnswer,
  submitExam,
  getAnswerRecord,
  getMyRecords,
  getExamRecords,
  getMyStats,
  gradeAnswer
} = require('../controllers/answerController');

const router = express.Router();

router.post('/start', protect, startExam);
router.post('/save', protect, saveAnswer);
router.post('/submit', protect, submitExam);
router.get('/my', protect, getMyRecords);
router.get('/my-stats', protect, getMyStats);
router.get('/exam/:examId', protect, getExamRecords);
router.get('/:id', protect, getAnswerRecord);
router.post('/grade', protect, gradeAnswer);

module.exports = router;