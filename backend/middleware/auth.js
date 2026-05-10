const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未授权访问，请先登录'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '无效的token，请重新登录'
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `角色 ${req.user.role} 无权限访问此资源`
      });
    }

    next();
  };
};

exports.checkOwnership = (model, idField = '_id') => {
  return async (req, res, next) => {
    try {
      const document = await model.findById(req.params.id);

      if (!document) {
        return res.status(404).json({
          success: false,
          message: '资源不存在'
        });
      }

      if (req.user.role === 'admin' || document.createdBy?.toString() === req.user._id.toString()) {
        req.document = document;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: '您没有权限修改此资源'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '检查权限时发生错误'
      });
    }
  };
};