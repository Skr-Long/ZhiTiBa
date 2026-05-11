const Question = require('../models/Question');
const Category = require('../models/Category');

exports.getQuestions = async (req, res) => {
  try {
    const {
      keyword,
      subject,
      chapter,
      difficulty,
      type,
      createdBy,
      isPublic,
      page = 1,
      limit = 20
    } = req.query;

    const query = { isActive: true };

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { analysis: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (subject) query.subject = subject;
    if (chapter) query.chapter = chapter;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;
    if (createdBy) query.createdBy = createdBy;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name')
      .populate('createdBy', 'username realName')
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(q => q.toQuestionResponse()),
        pagination: {
          current: options.page,
          pageSize: options.limit,
          total,
          totalPages: Math.ceil(total / options.limit)
        }
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: '获取题目列表失败'
    });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name')
      .populate('createdBy', 'username realName');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        question: question.toQuestionResponse()
      }
    });
  } catch (error) {
    console.error('Get question by id error:', error);
    res.status(500).json({
      success: false,
      message: '获取题目信息失败'
    });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const {
      title,
      type,
      options,
      correctAnswer,
      analysis,
      score,
      subject,
      chapter,
      difficulty,
      tags,
      source,
      knowledgePoints,
      isPublic
    } = req.body;

    if (!title || !correctAnswer || !subject) {
      return res.status(400).json({
        success: false,
        message: '题目内容、正确答案和学科为必填项'
      });
    }

    if (!['single', 'multiple', 'fill', 'judge', 'essay', 'other'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的题型'
      });
    }

    if ((type === 'single' || type === 'multiple') && (!options || options.length < 2)) {
      return res.status(400).json({
        success: false,
        message: '选择题至少需要2个选项'
      });
    }

    const subjectCategory = await Category.findOne({ _id: subject, type: 'subject' });
    if (!subjectCategory) {
      return res.status(400).json({
        success: false,
        message: '无效的学科分类'
      });
    }

    if (chapter) {
      const chapterCategory = await Category.findOne({ _id: chapter, type: 'chapter' });
      if (!chapterCategory) {
        return res.status(400).json({
          success: false,
          message: '无效的章节分类'
        });
      }
    }

    if (difficulty) {
      const difficultyCategory = await Category.findOne({ _id: difficulty, type: 'difficulty' });
      if (!difficultyCategory) {
        return res.status(400).json({
          success: false,
          message: '无效的难度分类'
        });
      }
    }

    const question = await Question.create({
      title,
      type,
      options,
      correctAnswer,
      analysis,
      score: score || 10,
      subject,
      chapter,
      difficulty,
      tags: tags || [],
      source,
      knowledgePoints: knowledgePoints || [],
      isPublic: isPublic || false,
      createdBy: req.user._id
    });

    const populatedQuestion = await Question.findById(question._id)
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name')
      .populate('createdBy', 'username realName');

    res.status(201).json({
      success: true,
      message: '题目创建成功',
      data: {
        question: populatedQuestion.toQuestionResponse()
      }
    });
  } catch (error) {
    console.error('Create question error:', error);
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
      message: '创建题目失败'
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const {
      title,
      type,
      options,
      correctAnswer,
      analysis,
      score,
      subject,
      chapter,
      difficulty,
      tags,
      source,
      knowledgePoints,
      isPublic
    } = req.body;

    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    if (req.user.role !== 'admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '您没有权限修改此题目'
      });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        title,
        type,
        options,
        correctAnswer,
        analysis,
        score,
        subject,
        chapter,
        difficulty,
        tags,
        source,
        knowledgePoints,
        isPublic,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );

    const populatedQuestion = await Question.findById(updatedQuestion._id)
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name')
      .populate('createdBy', 'username realName');

    res.status(200).json({
      success: true,
      message: '题目更新成功',
      data: {
        question: populatedQuestion.toQuestionResponse()
      }
    });
  } catch (error) {
    console.error('Update question error:', error);
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
      message: '更新题目失败'
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    if (req.user.role !== 'admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '您没有权限删除此题目'
      });
    }

    await Question.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: '题目删除成功'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: '删除题目失败'
    });
  }
};

exports.getMyQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const query = { createdBy: req.user._id, isActive: true };
    const total = await Question.countDocuments(query);

    const questions = await Question.find(query)
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name')
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(q => q.toQuestionResponse()),
        pagination: {
          current: options.page,
          pageSize: options.limit,
          total,
          totalPages: Math.ceil(total / options.limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my questions error:', error);
    res.status(500).json({
      success: false,
      message: '获取我的题目列表失败'
    });
  }
};

exports.batchDeleteQuestions = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要删除的题目'
      });
    }

    const questions = await Question.find({ _id: { $in: ids }, isActive: true });
    
    if (req.user.role !== 'admin') {
      const myQuestions = questions.filter(q => q.createdBy.toString() === req.user._id.toString());
      if (myQuestions.length !== questions.length) {
        return res.status(403).json({
          success: false,
          message: '您没有权限删除部分题目'
        });
      }
    }

    await Question.updateMany(
      { _id: { $in: ids } },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: `成功删除 ${ids.length} 道题目`
    });
  } catch (error) {
    console.error('Batch delete questions error:', error);
    res.status(500).json({
      success: false,
      message: '批量删除题目失败'
    });
  }
};

exports.importQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的题目数据'
      });
    }

    const createdQuestions = [];
    const errors = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const q = questions[i];

        if (!q.title || !q.correctAnswer || !q.subject) {
          errors.push({ index: i, message: '题目内容、正确答案和学科为必填项' });
          continue;
        }

        const question = await Question.create({
          title: q.title,
          type: q.type || 'single',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          analysis: q.analysis || '',
          score: q.score || 10,
          subject: q.subject,
          chapter: q.chapter || null,
          difficulty: q.difficulty || null,
          tags: q.tags || [],
          source: q.source || '',
          knowledgePoints: q.knowledgePoints || [],
          isPublic: q.isPublic || false,
          createdBy: req.user._id
        });

        createdQuestions.push(question._id);
      } catch (error) {
        errors.push({ index: i, message: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `导入完成，成功 ${createdQuestions.length} 题，失败 ${errors.length} 题`,
      data: {
        successCount: createdQuestions.length,
        errorCount: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Import questions error:', error);
    res.status(500).json({
      success: false,
      message: '导入题目失败'
    });
  }
};