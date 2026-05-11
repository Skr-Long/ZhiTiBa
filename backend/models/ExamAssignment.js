const mongoose = require('mongoose');

const ExamAssignmentSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedGroups: [{
    type: String,
    trim: true
  }],
  assignedClasses: [{
    type: String,
    trim: true
  }],
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deadline: {
    type: Date
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'expired', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

ExamAssignmentSchema.index({ exam: 1, isActive: 1 });
ExamAssignmentSchema.index({ 'assignedTo': 1, isActive: 1 });
ExamAssignmentSchema.index({ status: 1, isActive: 1 });

ExamAssignmentSchema.statics.findByStudent = function(studentId) {
  return this.find({
    assignedTo: studentId,
    isActive: true,
    status: { $in: ['active', 'scheduled'] }
  })
    .populate('exam', 'title subject totalScore duration type')
    .populate('assignedBy', 'username realName')
    .sort({ createdAt: -1 });
};

ExamAssignmentSchema.statics.findByExam = function(examId) {
  return this.find({ exam: examId, isActive: true })
    .populate('assignedTo', 'username realName school grade')
    .populate('assignedBy', 'username realName')
    .sort({ createdAt: -1 });
};

ExamAssignmentSchema.methods.toAssignmentResponse = function() {
  return {
    id: this._id,
    exam: this.exam ? {
      id: this.exam._id,
      title: this.exam.title
    } : null,
    assignedTo: this.assignedTo ? this.assignedTo.map(u => ({
      id: u._id,
      username: u.username,
      realName: u.realName
    })) : [],
    assignedGroups: this.assignedGroups,
    assignedClasses: this.assignedClasses,
    assignedBy: this.assignedBy ? {
      id: this.assignedBy._id,
      username: this.assignedBy.username,
      realName: this.assignedBy.realName
    } : null,
    deadline: this.deadline,
    startTime: this.startTime,
    endTime: this.endTime,
    allowLateSubmission: this.allowLateSubmission,
    latePenalty: this.latePenalty,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

ExamAssignmentSchema.methods.isAvailableForStudent = function(studentId) {
  if (!this.isActive) return false;
  if (this.status !== 'active' && this.status !== 'scheduled') return false;
  
  const now = new Date();
  if (this.startTime && now < this.startTime) return false;
  if (this.endTime && now > this.endTime) return false;
  
  if (this.assignedTo && this.assignedTo.length > 0) {
    if (!this.assignedTo.some(id => id.toString() === studentId.toString())) {
      return false;
    }
  }
  
  return true;
};

module.exports = mongoose.model('ExamAssignment', ExamAssignmentSchema);