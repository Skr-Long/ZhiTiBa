const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请输入分类名称'],
    trim: true,
    maxlength: [100, '分类名称不能超过100个字符']
  },
  type: {
    type: String,
    required: [true, '请选择分类类型'],
    enum: ['subject', 'chapter', 'difficulty'],
    trim: true
  },
  code: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  sort: {
    type: Number,
    default: 0
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

CategorySchema.index({ type: 1, isActive: 1 });
CategorySchema.index({ parent: 1, sort: 1 });

CategorySchema.statics.getSubjects = function() {
  return this.find({ type: 'subject', isActive: true }).sort({ sort: 1, createdAt: -1 });
};

CategorySchema.statics.getChapters = function(subjectId) {
  const query = { type: 'chapter', isActive: true };
  if (subjectId) {
    query.parent = subjectId;
  }
  return this.find(query).sort({ sort: 1, createdAt: -1 });
};

CategorySchema.statics.getDifficulties = function() {
  return this.find({ type: 'difficulty', isActive: true }).sort({ sort: 1, createdAt: -1 });
};

CategorySchema.methods.toCategoryResponse = function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    code: this.code,
    parent: this.parent,
    description: this.description,
    sort: this.sort,
    icon: this.icon,
    color: this.color,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Category', CategorySchema);