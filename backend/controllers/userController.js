const User = require('../models/User');
const { validationResult } = require('express-validator');

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      let message = '';
      if (existingUser.username === username) {
        message = '用户名已存在';
      } else if (existingUser.email === email) {
        message = '邮箱已被注册';
      }
      return res.status(400).json({
        success: false,
        message
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role === 'teacher' || role === 'admin' ? role : 'student'
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: user.toUserResponse(),
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: user.toUserResponse(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user.toUserResponse()
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { realName, phone, school, grade, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { realName, phone, school, grade, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: '个人信息更新成功',
      data: {
        user: user.toUserResponse()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: '更新个人信息失败'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入当前密码和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要6个字符'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '当前密码不正确'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: '密码修改失败'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, keyword } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (keyword) {
      query.$or = [
        { username: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { realName: { $regex: keyword, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => user.toUserResponse()),
        count: users.length
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toUserResponse()
      }
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, isActive, realName, school, grade } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isActive, realName, school, grade },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: user.toUserResponse()
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
};