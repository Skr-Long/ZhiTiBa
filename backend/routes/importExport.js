const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  uploadFile,
  importQuestions,
  exportQuestions,
  getTemplate
} = require('../controllers/importExportController');

const router = express.Router();

router.post('/import', protect, uploadFile, importQuestions);
router.post('/export-json', protect, exportQuestions);
router.post('/export-excel', protect, exportQuestions);
router.get('/export', protect, exportQuestions);
router.get('/template', protect, getTemplate);

module.exports = router;