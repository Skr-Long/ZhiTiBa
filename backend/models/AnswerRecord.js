const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  userAnswer: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  correctAnswer: {
    type: String,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    required: true
  }
}, {
  _id: false
});

const AnswerRecordSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamAssignment'
  },
  answers: [AnswerSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  correctCount: {
    type: Number,
    default: 0
  },
  wrongCount: {
    type: Number,
    default: 0
  },
  unansweredCount: {
    type: Number,
    default: 0
  },
  accuracyRate: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  submitTime: {
    type: Date
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  attempt: {
    type: Number,
    default: 1
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  isLate: {
    type: Boolean,
    default: false
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  gradingStatus: {
    type: String,
    enum: ['auto', 'manual', 'partial', 'none'],
    default: 'none'
  },
  teacherComment: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

AnswerRecordSchema.index({ exam: 1, student: 1, isActive: 1 });
AnswerRecordSchema.index({ student: 1, isActive: 1 });
AnswerRecordSchema.index({ isSubmitted: 1, isActive: 1 });
AnswerRecordSchema.index({ createdAt: -1, isActive: 1 });

AnswerRecordSchema.statics.findByStudent = function(studentId, examId = null) {
  const query = { student: studentId, isActive: true };
  if (examId) query.exam = examId;
  return this.find(query)
    .populate('exam', 'title subject totalScore duration')
    .populate('student', 'username realName')
    .sort({ createdAt: -1 });
};

AnswerRecordSchema.statics.findByExam = function(examId) {
  return this.find({ exam: examId, isActive: true, isSubmitted: true })
    .populate('student', 'username realName school grade')
    .populate('exam', 'title totalScore')
    .sort({ totalScore: -1 });
};

AnswerRecordSchema.statics.getStudentStats = async function(studentId) {
  const records = await this.find({ student: studentId, isActive: true, isSubmitted: true });
  
  if (records.length === 0) {
    return {
      totalExams: 0,
      totalScore: 0,
      avgScore: 0,
      avgAccuracy: 0,
      bestScore: 0,
      totalTimeSpent: 0
    };
  }

  const totalScore = records.reduce((sum, r) => sum + r.totalScore, 0);
  const totalMaxScore = records.reduce((sum, r) => sum + r.maxScore, 0);
  const avgAccuracy = records.reduce((sum, r) => sum + r.accuracyRate, 0) / records.length;
  const bestScore = Math.max(...records.map(r => (r.totalScore / r.maxScore) * 100));
  const totalTimeSpent = records.reduce((sum, r) => sum + r.timeSpent, 0);

  return {
    totalExams: records.length,
    totalScore,
    avgScore: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
    avgAccuracy,
    bestScore,
    totalTimeSpent
  };
};

AnswerRecordSchema.statics.getExamStats = async function(examId) {
  const records = await this.find({ exam: examId, isActive: true, isSubmitted: true });
  
  if (records.length === 0) {
    return {
      submitCount: 0,
      avgScore: 0,
      avgAccuracy: 0,
      highestScore: 0,
      lowestScore: 0,
      scoreDistribution: []
    };
  }

  const scores = records.map(r => (r.totalScore / r.maxScore) * 100);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgAccuracy = records.reduce((sum, r) => sum + r.accuracyRate, 0) / records.length;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  const scoreDistribution = [
    { range: '90-100', count: scores.filter(s => s >= 90).length },
    { range: '80-89', count: scores.filter(s => s >= 80 && s < 90).length },
    { range: '70-79', count: scores.filter(s => s >= 70 && s < 80).length },
    { range: '60-69', count: scores.filter(s => s >= 60 && s < 70).length },
    { range: '0-59', count: scores.filter(s => s < 60).length }
  ];

  return {
    submitCount: records.length,
    avgScore,
    avgAccuracy,
    highestScore,
    lowestScore,
    scoreDistribution
  };
};

AnswerRecordSchema.methods.toRecordResponse = function(detailed = false) {
  const response = {
    id: this._id,
    exam: this.exam ? {
      id: this.exam._id,
      title: this.exam.title
    } : null,
    student: this.student ? {
      id: this.student._id,
      username: this.student.username,
      realName: this.student.realName
    } : null,
    totalScore: this.totalScore,
    maxScore: this.maxScore,
    correctCount: this.correctCount,
    wrongCount: this.wrongCount,
    unansweredCount: this.unansweredCount,
    accuracyRate: this.accuracyRate,
    startTime: this.startTime,
    submitTime: this.submitTime,
    timeSpent: this.timeSpent,
    attempt: this.attempt,
    isSubmitted: this.isSubmitted,
    isLate: this.isLate,
    gradingStatus: this.gradingStatus,
    teacherComment: this.teacherComment,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (detailed && this.answers) {
    response.answers = this.answers.map(a => ({
      questionId: a.questionId,
      userAnswer: a.userAnswer,
      correctAnswer: a.correctAnswer,
      isCorrect: a.isCorrect,
      score: a.score,
      maxScore: a.maxScore,
      timeSpent: a.timeSpent,
      order: a.order
    }));
  }

  return response;
};

AnswerRecordSchema.methods.calculateStats = function() {
  if (this.answers && this.answers.length > 0) {
    this.totalScore = this.answers.reduce((sum, a) => sum + (a.score || 0), 0);
    this.maxScore = this.answers.reduce((sum, a) => sum + (a.maxScore || 0), 0);
    this.correctCount = this.answers.filter(a => a.isCorrect).length;
    this.wrongCount = this.answers.filter(a => !a.isCorrect && a.userAnswer).length;
    this.unansweredCount = this.answers.filter(a => !a.userAnswer).length;
    this.accuracyRate = this.answers.length > 0 
      ? (this.correctCount / this.answers.length) * 100 
      : 0;
  }
  return this;
};

AnswerRecordSchema.methods.markSubmitted = function() {
  this.isSubmitted = true;
  this.submitTime = new Date();
  if (this.startTime) {
    this.timeSpent = Math.floor((this.submitTime - this.startTime) / 1000);
  }
  return this.calculateStats();
};

module.exports = mongoose.model('AnswerRecord', AnswerRecordSchema);