const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入题目内容'],
    trim: true,
    minlength: [5, '题目内容至少需要5个字符']
  },
  type: {
    type: String,
    required: [true, '请选择题型'],
    enum: ['single', 'multiple', 'fill', 'judge', 'essay', 'other'],
    default: 'single'
  },
  options: [{
    _id: false,
    key: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    }
  }],
  correctAnswer: {
    type: String,
    required: [true, '请输入正确答案'],
    trim: true
  },
  analysis: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    default: 10
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, '请选择学科']
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  difficulty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  source: {
    type: String,
    trim: true,
    default: ''
  },
  knowledgePoints: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  solveCount: {
    type: Number,
    default: 0
  },
  correctRate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

QuestionSchema.index({ subject: 1, isActive: 1 });
QuestionSchema.index({ difficulty: 1, isActive: 1 });
QuestionSchema.index({ createdBy: 1, isActive: 1 });
QuestionSchema.index({ type: 1, isActive: 1 });
QuestionSchema.index({ tags: 1, isActive: 1 });

QuestionSchema.statics.findBySubject = function(subjectId) {
  return this.find({ subject: subjectId, isActive: true })
    .populate('subject', 'name')
    .populate('chapter', 'name')
    .populate('difficulty', 'name');
};

QuestionSchema.statics.search = function(query, options = {}) {
  const searchQuery = { isActive: true };

  if (query.keyword) {
    searchQuery.$or = [
      { title: { $regex: query.keyword, $options: 'i' } },
      { analysis: { $regex: query.keyword, $options: 'i' } },
      { tags: { $regex: query.keyword, $options: 'i' } }
    ];
  }

  if (query.subject) {
    searchQuery.subject = query.subject;
  }

  if (query.chapter) {
    searchQuery.chapter = query.chapter;
  }

  if (query.difficulty) {
    searchQuery.difficulty = query.difficulty;
  }

  if (query.type) {
    searchQuery.type = query.type;
  }

  if (query.createdBy) {
    searchQuery.createdBy = query.createdBy;
  }

  return this.find(searchQuery)
    .populate('subject', 'name')
    .populate('chapter', 'name')
    .populate('difficulty', 'name')
    .populate('createdBy', 'username realName')
    .sort({ createdAt: -1 });
};

QuestionSchema.methods.toQuestionResponse = function() {
  return {
    id: this._id,
    title: this.title,
    type: this.type,
    options: this.options,
    correctAnswer: this.correctAnswer,
    analysis: this.analysis,
    score: this.score,
    subject: this.subject ? {
      id: this.subject._id,
      name: this.subject.name
    } : null,
    chapter: this.chapter ? {
      id: this.chapter._id,
      name: this.chapter.name
    } : null,
    difficulty: this.difficulty ? {
      id: this.difficulty._id,
      name: this.difficulty.name
    } : null,
    tags: this.tags,
    source: this.source,
    knowledgePoints: this.knowledgePoints,
    isPublic: this.isPublic,
    viewCount: this.viewCount,
    solveCount: this.solveCount,
    correctRate: this.correctRate,
    createdBy: this.createdBy ? {
      id: this.createdBy._id,
      username: this.createdBy.username,
      realName: this.createdBy.realName
    } : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Question', QuestionSchema);