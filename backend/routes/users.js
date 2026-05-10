const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名需要3-50个字符')
      .notEmpty()
      .withMessage('用户名不能为空'),
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .notEmpty()
      .withMessage('邮箱不能为空'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('密码需要6-100个字符')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  register
);

router.post(
  '/login',
  [
    body('identifier')
      .notEmpty()
      .withMessage('用户名或邮箱不能为空'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  login
);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;