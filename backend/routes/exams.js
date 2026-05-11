const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  publishExam,
  unpublishExam,
  generateExamByChapters,
  generateExamByAI,
  batchDeleteExams
} = require('../controllers/examController');

const router = express.Router();

router.route('/')
  .get(protect, getExams)
  .post(protect, createExam);

router.post('/batch-delete', protect, batchDeleteExams);
router.post('/generate-by-chapters', protect, generateExamByChapters);
router.post('/generate-by-ai', protect, generateExamByAI);

router.get('/:id', protect, getExamById);
router.put('/:id', protect, updateExam);
router.delete('/:id', protect, deleteExam);
router.post('/:id/publish', protect, publishExam);
router.post('/:id/unpublish', protect, unpublishExam);

module.exports = router;