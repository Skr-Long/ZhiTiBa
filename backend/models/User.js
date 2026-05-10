const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请输入用户名'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [50, '用户名不能超过50个字符']
  },
  email: {
    type: String,
    required: [true, '请输入邮箱'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      '请输入有效的邮箱地址'
    ]
  },
  password: {
    type: String,
    required: [true, '请输入密码'],
    minlength: [6, '密码至少需要6个字符'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  realName: {
    type: String,
    trim: true,
    maxlength: [50, '真实姓名不能超过50个字符']
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号']
  },
  school: {
    type: String,
    trim: true
  },
  grade: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

UserSchema.methods.toUserResponse = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    realName: this.realName,
    avatar: this.avatar,
    phone: this.phone,
    school: this.school,
    grade: this.grade,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', UserSchema);