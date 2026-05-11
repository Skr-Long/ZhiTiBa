const AnswerRecord = require('../models/AnswerRecord');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAssignment = require('../models/ExamAssignment');

exports.startExam = async (req, res) => {
  try {
    const { examId, assignmentId } = req.body;

    const exam = await Exam.findById(examId)
      .populate({
        path: 'questions.question',
        select: 'title type options correctAnswer analysis score'
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '试卷不存在'
      });
    }

    if (!exam.isPublished) {
      return res.status(400).json({
        success: false,
        message: '试卷尚未发布'
      });
    }

    const existingAttempts = await AnswerRecord.countDocuments({
      exam: examId,
      student: req.user._id,
      isSubmitted: true
    });

    if (!exam.allowRetry && existingAttempts > 0) {
      return res.status(400).json({
        success: false,
        message: '不允许重考'
      });
    }

    if (existingAttempts >= exam.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: `最多只能尝试 ${exam.maxAttempts} 次`
      });
    }

    const questions = exam.questions || [];
    
    let shuffledQuestions = [...questions];
    if (exam.shuffleQuestions) {
      shuffledQuestions = shuffledQuestions.sort(() => Math.random() - 0.5);
    }

    const answers = shuffledQuestions.map((q, index) => ({
      questionId: q.question._id,
      userAnswer: '',
      correctAnswer: q.question.correctAnswer,
      isCorrect: false,
      score: 0,
      maxScore: q.score,
      timeSpent: 0,
      order: index
    }));

    const answerRecord = await AnswerRecord.create({
      exam: examId,
      student: req.user._id,
      assignment: assignmentId,
      answers,
      maxScore: exam.totalScore,
      attempt: existingAttempts + 1,
      isSubmitted: false
    });

    const examQuestions = shuffledQuestions.map(q => {
      const question = q.question;
      let options = question.options || [];
      
      if (exam.shuffleOptions && (question.type === 'single' || question.type === 'multiple')) {
        options = [...options].sort(() => Math.random() - 0.5);
      }

      return {
        id: question._id,
        title: question.title,
        type: question.type,
        options: options,
        score: q.score,
        order: q.order
      };
    });

    res.status(200).json({
      success: true,
      data: {
        recordId: answerRecord._id,
        exam: {
          id: exam._id,
          title: exam.title,
          duration: exam.duration,
          totalScore: exam.totalScore,
          questionCount: exam.questionCount
        },
        questions: examQuestions,
        startTime: answerRecord.startTime
      }
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({
      success: false,
      message: '开始答题失败'
    });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { recordId, questionId, userAnswer, timeSpent } = req.body;

    const answerRecord = await AnswerRecord.findById(recordId);

    if (!answerRecord) {
      return res.status(404).json({
        success: false,
        message: '答题记录不存在'
      });
    }

    if (answerRecord.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此答题记录'
      });
    }

    if (answerRecord.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: '试卷已提交，无法修改答案'
      });
    }

    const answerIndex = answerRecord.answers.findIndex(
      a => a.questionId.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    answerRecord.answers[answerIndex].userAnswer = userAnswer;
    if (timeSpent) {
      answerRecord.answers[answerIndex].timeSpent = timeSpent;
    }

    await answerRecord.save();

    res.status(200).json({
      success: true,
      message: '答案保存成功'
    });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({
      success: false,
      message: '保存答案失败'
    });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const { recordId, answers } = req.body;

    const answerRecord = await AnswerRecord.findById(recordId)
      .populate('exam', 'showAnswerAfterSubmit showScoreAfterSubmit maxAttempts');

    if (!answerRecord) {
      return res.status(404).json({
        success: false,
        message: '答题记录不存在'
      });
    }

    if (answerRecord.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此答题记录'
      });
    }

    if (answerRecord.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: '试卷已提交'
      });
    }

    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        const answerIndex = answerRecord.answers.findIndex(
          a => a.questionId.toString() === ans.questionId
        );
        if (answerIndex !== -1) {
          answerRecord.answers[answerIndex].userAnswer = ans.userAnswer || '';
          if (ans.timeSpent) {
            answerRecord.answers[answerIndex].timeSpent = ans.timeSpent;
          }
        }
      }
    }

    const questionIds = answerRecord.answers.map(a => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    let totalCorrect = 0;
    let totalScore = 0;
    let hasSubjective = false;

    for (const ans of answerRecord.answers) {
      const question = questions.find(q => q._id.toString() === ans.questionId.toString());
      
      if (!question) continue;

      ans.correctAnswer = question.correctAnswer;

      if (question.type === 'fill' || question.type === 'essay') {
        hasSubjective = true;
        ans.isCorrect = false;
        ans.score = 0;
      } else {
        const userAnswer = (ans.userAnswer || '').toString().trim().toUpperCase();
        const correctAnswer = (question.correctAnswer || '').toString().trim().toUpperCase();
        
        let isCorrect = false;
        
        if (question.type === 'judge') {
          isCorrect = userAnswer === correctAnswer ||
            (userAnswer === '对' && correctAnswer === 'TRUE') ||
            (userAnswer === '错' && correctAnswer === 'FALSE') ||
            (userAnswer === 'T' && correctAnswer === 'TRUE') ||
            (userAnswer === 'F' && correctAnswer === 'FALSE');
        } else if (question.type === 'multiple') {
          const userSorted = userAnswer.split('').sort().join('');
          const correctSorted = correctAnswer.split('').sort().join('');
          isCorrect = userSorted === correctSorted;
        } else {
          isCorrect = userAnswer === correctAnswer;
        }

        ans.isCorrect = isCorrect;
        if (isCorrect) {
          ans.score = ans.maxScore;
          totalCorrect++;
        } else {
          ans.score = 0;
        }
      }

      totalScore += ans.score;
    }

    answerRecord.totalScore = totalScore;
    answerRecord.correctCount = totalCorrect;
    answerRecord.wrongCount = answerRecord.answers.filter(
      a => a.userAnswer && !a.isCorrect
    ).length;
    answerRecord.unansweredCount = answerRecord.answers.filter(
      a => !a.userAnswer || a.userAnswer === ''
    ).length;
    answerRecord.accuracyRate = answerRecord.answers.length > 0
      ? (totalCorrect / answerRecord.answers.length) * 100
      : 0;

    answerRecord.isSubmitted = true;
    answerRecord.submitTime = new Date();
    answerRecord.gradingStatus = hasSubjective ? 'partial' : 'auto';

    if (answerRecord.startTime) {
      answerRecord.timeSpent = Math.floor((answerRecord.submitTime - answerRecord.startTime) / 1000);
    }

    await answerRecord.save();

    const exam = answerRecord.exam;
    if (exam) {
      exam.submitCount += 1;
      exam.avgScore = ((exam.avgScore * (exam.submitCount - 1) + (totalScore / answerRecord.maxScore) * 100) / exam.submitCount);
      await exam.save();
    }

    const responseData = {
      recordId: answerRecord._id,
      totalScore: answerRecord.totalScore,
      maxScore: answerRecord.maxScore,
      correctCount: answerRecord.correctCount,
      wrongCount: answerRecord.wrongCount,
      unansweredCount: answerRecord.unansweredCount,
      accuracyRate: answerRecord.accuracyRate,
      timeSpent: answerRecord.timeSpent,
      gradingStatus: answerRecord.gradingStatus
    };

    if (exam?.showScoreAfterSubmit) {
      responseData.showScore = true;
    }

    if (exam?.showAnswerAfterSubmit) {
      responseData.showAnswer = true;
      responseData.answers = answerRecord.answers.map(a => ({
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: a.isCorrect,
        score: a.score,
        maxScore: a.maxScore
      }));
    }

    res.status(200).json({
      success: true,
      message: '试卷提交成功',
      data: responseData
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: '提交试卷失败'
    });
  }
};

exports.getAnswerRecord = async (req, res) => {
  try {
    const answerRecord = await AnswerRecord.findById(req.params.id)
      .populate('exam', 'title totalScore showAnswerAfterSubmit showScoreAfterSubmit')
      .populate('student', 'username realName');

    if (!answerRecord) {
      return res.status(404).json({
        success: false,
        message: '答题记录不存在'
      });
    }

    if (req.user.role === 'student' && 
        answerRecord.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限查看此答题记录'
      });
    }

    let detailedAnswers = answerRecord.answers;
    if (req.user.role === 'student') {
      const exam = answerRecord.exam;
      if (!exam.showAnswerAfterSubmit && !exam.showScoreAfterSubmit) {
        detailedAnswers = answerRecord.answers.map(a => ({
          questionId: a.questionId,
          userAnswer: a.userAnswer,
          isCorrect: exam.showScoreAfterSubmit ? a.isCorrect : undefined,
          score: exam.showScoreAfterSubmit ? a.score : undefined
        }));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        record: answerRecord.toRecordResponse(),
        answers: detailedAnswers
      }
    });
  } catch (error) {
    console.error('Get answer record error:', error);
    res.status(500).json({
      success: false,
      message: '获取答题记录失败'
    });
  }
};

exports.getMyRecords = async (req, res) => {
  try {
    const { examId, page = 1, limit = 20 } = req.query;
    const query = { student: req.user._id, isActive: true };
    
    if (examId) {
      query.exam = examId;
    }

    const total = await AnswerRecord.countDocuments(query);
    const records = await AnswerRecord.find(query)
      .populate('exam', 'title totalScore duration')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        records: records.map(r => r.toRecordResponse()),
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my records error:', error);
    res.status(500).json({
      success: false,
      message: '获取答题记录失败'
    });
  }
};

exports.getExamRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const examId = req.params.examId;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '试卷不存在'
      });
    }

    if (req.user.role === 'teacher' && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限查看此试卷的答题记录'
      });
    }

    const query = { exam: examId, isActive: true, isSubmitted: true };
    const total = await AnswerRecord.countDocuments(query);
    const records = await AnswerRecord.find(query)
      .populate('student', 'username realName school grade')
      .sort({ totalScore: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const stats = await AnswerRecord.getExamStats(examId);

    res.status(200).json({
      success: true,
      data: {
        records: records.map(r => r.toRecordResponse()),
        stats,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get exam records error:', error);
    res.status(500).json({
      success: false,
      message: '获取答题记录失败'
    });
  }
};

exports.getMyStats = async (req, res) => {
  try {
    const stats = await AnswerRecord.getStudentStats(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get my stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
};

exports.gradeAnswer = async (req, res) => {
  try {
    const { recordId, questionId, score, comment } = req.body;

    const answerRecord = await AnswerRecord.findById(recordId);

    if (!answerRecord) {
      return res.status(404).json({
        success: false,
        message: '答题记录不存在'
      });
    }

    const exam = await Exam.findById(answerRecord.exam);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限批改此试卷'
      });
    }

    const answerIndex = answerRecord.answers.findIndex(
      a => a.questionId.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    const answer = answerRecord.answers[answerIndex];
    if (score !== undefined) {
      answer.score = Math.max(0, Math.min(score, answer.maxScore));
      answer.isCorrect = score > 0;
    }

    if (comment) {
      answerRecord.teacherComment = comment;
    }

    answerRecord.totalScore = answerRecord.answers.reduce((sum, a) => sum + (a.score || 0), 0);
    answerRecord.correctCount = answerRecord.answers.filter(a => a.isCorrect).length;
    answerRecord.accuracyRate = answerRecord.answers.length > 0
      ? (answerRecord.correctCount / answerRecord.answers.length) * 100
      : 0;
    answerRecord.gradingStatus = 'manual';
    answerRecord.gradedBy = req.user._id;
    answerRecord.gradedAt = new Date();

    await answerRecord.save();

    res.status(200).json({
      success: true,
      message: '批改成功',
      data: {
        totalScore: answerRecord.totalScore
      }
    });
  } catch (error) {
    console.error('Grade answer error:', error);
    res.status(500).json({
      success: false,
      message: '批改失败'
    });
  }
};