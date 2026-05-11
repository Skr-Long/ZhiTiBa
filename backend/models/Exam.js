const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请输入试卷标题'],
    trim: true,
    maxlength: [200, '标题不能超过200个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, '请选择学科']
  },
  type: {
    type: String,
    enum: ['class_test', 'monthly', 'midterm', 'final', 'practice', 'other'],
    default: 'practice'
  },
  difficulty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  totalScore: {
    type: Number,
    default: 100
  },
  duration: {
    type: Number,
    default: 60
  },
  questions: [{
    _id: false,
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    score: {
      type: Number,
      required: true,
      default: 10
    },
    order: {
      type: Number,
      required: true
    }
  }],
  questionCount: {
    type: Number,
    default: 0
  },
  chapters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishTime: {
    type: Date
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  allowRetry: {
    type: Boolean,
    default: true
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  showAnswerAfterSubmit: {
    type: Boolean,
    default: true
  },
  showScoreAfterSubmit: {
    type: Boolean,
    default: true
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
    type: Boolean,
    default: false
  },
  generatedByAI: {
    type: Boolean,
    default: false
  },
  aiAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIAgent'
  },
  aiPrompt: {
    type: String
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
  assignmentCount: {
    type: Number,
    default: 0
  },
  submitCount: {
    type: Number,
    default: 0
  },
  avgScore: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

ExamSchema.index({ subject: 1, isActive: 1 });
ExamSchema.index({ createdBy: 1, isActive: 1 });
ExamSchema.index({ type: 1, isActive: 1 });
ExamSchema.index({ isPublished: 1, isActive: 1 });

ExamSchema.statics.findBySubject = function(subjectId) {
  return this.find({ subject: subjectId, isActive: true })
    .populate('subject', 'name')
    .populate('difficulty', 'name')
    .populate('createdBy', 'username realName')
    .sort({ createdAt: -1 });
};

ExamSchema.statics.search = function(query, options = {}) {
  const searchQuery = { isActive: true };

  if (query.keyword) {
    searchQuery.$or = [
      { title: { $regex: query.keyword, $options: 'i' } },
      { description: { $regex: query.keyword, $options: 'i' } },
      { tags: { $regex: query.keyword, $options: 'i' } }
    ];
  }

  if (query.subject) {
    searchQuery.subject = query.subject;
  }

  if (query.type) {
    searchQuery.type = query.type;
  }

  if (query.createdBy) {
    searchQuery.createdBy = query.createdBy;
  }

  if (query.isPublished !== undefined) {
    searchQuery.isPublished = query.isPublished === 'true';
  }

  return this.find(searchQuery)
    .populate('subject', 'name')
    .populate('difficulty', 'name')
    .populate('createdBy', 'username realName')
    .populate('aiAgent', 'name')
    .sort({ createdAt: -1 });
};

ExamSchema.statics.getPublishedExams = function() {
  return this.find({ isPublished: true, isActive: true })
    .populate('subject', 'name')
    .populate('difficulty', 'name')
    .populate('createdBy', 'username realName')
    .sort({ publishTime: -1 });
};

ExamSchema.methods.toExamResponse = function(detailed = false) {
  const response = {
    id: this._id,
    title: this.title,
    description: this.description,
    subject: this.subject ? {
      id: this.subject._id,
      name: this.subject.name
    } : null,
    type: this.type,
    difficulty: this.difficulty ? {
      id: this.difficulty._id,
      name: this.difficulty.name
    } : null,
    totalScore: this.totalScore,
    duration: this.duration,
    questionCount: this.questionCount,
    chapters: this.chapters,
    tags: this.tags,
    isPublic: this.isPublic,
    isPublished: this.isPublished,
    publishTime: this.publishTime,
    startTime: this.startTime,
    endTime: this.endTime,
    allowRetry: this.allowRetry,
    maxAttempts: this.maxAttempts,
    showAnswerAfterSubmit: this.showAnswerAfterSubmit,
    showScoreAfterSubmit: this.showScoreAfterSubmit,
    shuffleQuestions: this.shuffleQuestions,
    shuffleOptions: this.shuffleOptions,
    generatedByAI: this.generatedByAI,
    aiAgent: this.aiAgent ? {
      id: this.aiAgent._id,
      name: this.aiAgent.name
    } : null,
    assignmentCount: this.assignmentCount,
    submitCount: this.submitCount,
    avgScore: this.avgScore,
    createdBy: this.createdBy ? {
      id: this.createdBy._id,
      username: this.createdBy.username,
      realName: this.createdBy.realName
    } : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (detailed && this.questions) {
    response.questions = this.questions.map(q => ({
      question: q.question,
      score: q.score,
      order: q.order
    }));
  }

  return response;
};

ExamSchema.methods.calculateTotalScore = function() {
  if (this.questions && this.questions.length > 0) {
    this.totalScore = this.questions.reduce((sum, q) => sum + (q.score || 0), 0);
  }
  this.questionCount = this.questions ? this.questions.length : 0;
  return this;
};

ExamSchema.methods.incrementStats = function() {
  this.assignmentCount += 1;
  return this.save();
};

module.exports = mongoose.model('Exam', ExamSchema);