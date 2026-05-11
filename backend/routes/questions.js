const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getMyQuestions,
  importQuestions,
  batchDeleteQuestions
} = require('../controllers/questionController');

const router = express.Router();

router.get('/my', protect, getMyQuestions);
router.post('/import', protect, importQuestions);
router.post('/batch-delete', protect, batchDeleteQuestions);

router.route('/')
  .get(getQuestions)
  .post(protect, createQuestion);

router.route('/:id')
  .get(getQuestionById)
  .put(protect, updateQuestion)
  .delete(protect, deleteQuestion);

module.exports = router;