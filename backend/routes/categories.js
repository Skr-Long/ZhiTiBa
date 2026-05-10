const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCategories,
  getSubjects,
  getChapters,
  getDifficulties,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

router.get('/subjects', getSubjects);
router.get('/chapters', getChapters);
router.get('/difficulties', getDifficulties);

router.route('/')
  .get(getCategories)
  .post(protect, createCategory);

router.route('/:id')
  .get(getCategoryById)
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

module.exports = router;