const Exam = require('../models/Exam');
const Question = require('../models/Question');
const AIAgent = require('../models/AIAgent');
const axios = require('axios');

exports.getExams = async (req, res) => {
  try {
    const { keyword, subject, type, createdBy, isPublished, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (subject) query.subject = subject;
    if (type) query.type = type;
    if (createdBy) query.createdBy = createdBy;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    if (req.user.role === 'student') {
      query.isPublished = true;
      query.isPublic = true;
    } else if (req.user.role === 'teacher') {
      const teacherQuery = { ...query };
      delete teacherQuery.$or;
      query.$or = [
        { ...teacherQuery, createdBy: req.user._id },
        { ...teacherQuery, isPublic: true, isPublished: true }
      ];
      delete query.createdBy;
      delete query.isPublic;
      delete query.isPublished;
    }

    const total = await Exam.countDocuments(query);
    const exams = await Exam.find(query)
      .populate('subject', 'name')
      .populate('difficulty', 'name')
      .populate('createdBy', 'username realName')
      .populate('aiAgent', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        exams: exams.map(e => e.toExamResponse()),
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: '获取试卷列表失败'
    });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'name')
      .populate('difficulty', 'name')
      .populate('chapters', 'name')
      .populate('createdBy', 'username realName')
      .populate('aiAgent', 'name')
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

    res.status(200).json({
      success: true,
      data: {
        exam: exam.toExamResponse(true)
      }
    });
  } catch (error) {
    console.error('Get exam by id error:', error);
    res.status(500).json({
      success: false,
      message: '获取试卷详情失败'
    });
  }
};

exports.createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      type,
      difficulty,
      totalScore,
      duration,
      questions,
      chapters,
      tags,
      isPublic,
      startTime,
      endTime,
      allowRetry,
      maxAttempts,
      showAnswerAfterSubmit,
      showScoreAfterSubmit,
      shuffleQuestions,
      shuffleOptions,
      settings
    } = req.body;

    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        message: '试卷标题和学科为必填项'
      });
    }

    const examSettings = settings || {};

    let questionData = [];
    if (questions && Array.isArray(questions)) {
      questionData = questions.map((q, index) => ({
        question: q.question || q.id || q,
        score: q.score || 10,
        order: q.order !== undefined ? q.order : index
      }));
    }

    const exam = await Exam.create({
      title,
      description,
      subject,
      type: type || 'practice',
      difficulty,
      totalScore: totalScore || 100,
      duration: duration || 60,
      questions: questionData,
      chapters: chapters || [],
      tags: tags || [],
      isPublic: isPublic || false,
      startTime,
      endTime,
      allowRetry: allowRetry !== undefined ? allowRetry : (examSettings.allowRetry !== undefined ? examSettings.allowRetry : true),
      maxAttempts: maxAttempts || 3,
      showAnswerAfterSubmit: showAnswerAfterSubmit !== undefined ? showAnswerAfterSubmit : (examSettings.showAnswerAfterSubmit !== undefined ? examSettings.showAnswerAfterSubmit : true),
      showScoreAfterSubmit: showScoreAfterSubmit !== undefined ? showScoreAfterSubmit : (examSettings.showScoreAfterSubmit !== undefined ? examSettings.showScoreAfterSubmit : true),
      shuffleQuestions: shuffleQuestions || examSettings.shuffleQuestions || false,
      shuffleOptions: shuffleOptions || examSettings.shuffleOptions || false,
      createdBy: req.user._id
    });

    exam.questionCount = questionData.length;
    await exam.save();

    res.status(201).json({
      success: true,
      message: '试卷创建成功',
      data: {
        exam: exam.toExamResponse()
      }
    });
  } catch (error) {
    console.error('Create exam error:', error);
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
      message: '创建试卷失败'
    });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '试卷不存在'
      });
    }

    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限修改此试卷'
      });
    }

    const { questions, settings, ...updateData } = req.body;

    if (questions && Array.isArray(questions)) {
      updateData.questions = questions.map((q, index) => ({
        question: q.question || q.id || q,
        score: q.score || 10,
        order: q.order !== undefined ? q.order : index
      }));
      updateData.questionCount = questions.length;
    }

    if (settings) {
      if (settings.allowRetry !== undefined) updateData.allowRetry = settings.allowRetry;
      if (settings.showAnswerAfterSubmit !== undefined) updateData.showAnswerAfterSubmit = settings.showAnswerAfterSubmit;
      if (settings.showScoreAfterSubmit !== undefined) updateData.showScoreAfterSubmit = settings.showScoreAfterSubmit;
      if (settings.shuffleQuestions !== undefined) updateData.shuffleQuestions = settings.shuffleQuestions;
      if (settings.shuffleOptions !== undefined) updateData.shuffleOptions = settings.shuffleOptions;
    }

    updateData.updatedBy = req.user._id;

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: '试卷更新成功',
      data: {
        exam: updatedExam.toExamResponse()
      }
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: '更新试卷失败'
    });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '试卷不存在'
      });
    }

    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限删除此试卷'
      });
    }

    exam.isActive = false;
    await exam.save();

    res.status(200).json({
      success: true,
      message: '试卷删除成功'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: '删除试卷失败'
    });
  }
};

exports.publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '试卷不存在'
      });
    }

    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限发布此试卷'
      });
    }

    exam.isPublished = true;
    exam.publishTime = new Date();
    exam.updatedBy = req.user._id;
    await exam.save();

    res.status(200).json({
      success: true,
      message: '试卷发布成功',
      data: {
        exam: exam.toExamResponse()
      }
    });
  } catch (error) {
    console.error('Publish exam error:', error);
    res.status(500).json({
      success: false,
      message: '发布试卷失败'
    });
  }
};

exports.unpublishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '试卷不存在'
      });
    }

    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此试卷'
      });
    }

    exam.isPublished = false;
    exam.updatedBy = req.user._id;
    await exam.save();

    res.status(200).json({
      success: true,
      message: '试卷已取消发布',
      data: {
        exam: exam.toExamResponse()
      }
    });
  } catch (error) {
    console.error('Unpublish exam error:', error);
    res.status(500).json({
      success: false,
      message: '取消发布失败'
    });
  }
};

exports.generateExamByChapters = async (req, res) => {
  try {
    const {
      title,
      subject,
      chapters,
      difficulty,
      questionCount,
      totalScore,
      duration,
      type
    } = req.body;

    if (!subject || !chapters || chapters.length === 0) {
      return res.status(400).json({
        success: false,
        message: '学科和章节为必填项'
      });
    }

    const query = {
      subject,
      chapter: { $in: chapters },
      isActive: true
    };

    if (difficulty) {
      query.difficulty = difficulty;
    }

    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .limit(questionCount || 20);

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '所选章节下没有题目，请先添加题目'
      });
    }

    const scorePerQuestion = Math.floor((totalScore || 100) / questions.length);
    const remainingScore = (totalScore || 100) - (scorePerQuestion * (questions.length - 1));

    const questionData = questions.map((q, index) => ({
      question: q._id,
      score: index === questions.length - 1 ? remainingScore : scorePerQuestion,
      order: index
    }));

    const exam = await Exam.create({
      title: title || `按章节生成的试卷 - ${new Date().toLocaleDateString()}`,
      subject,
      chapters,
      difficulty,
      type: type || 'practice',
      totalScore: totalScore || 100,
      duration: duration || 60,
      questions: questionData,
      questionCount: questions.length,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: '试卷生成成功',
      data: {
        exam: exam.toExamResponse(),
        generatedQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('Generate exam by chapters error:', error);
    res.status(500).json({
      success: false,
      message: '生成试卷失败'
    });
  }
};

exports.generateExamByAI = async (req, res) => {
  try {
    const {
      title,
      subject,
      description,
      aiAgentId,
      prompt,
      questionCount,
      difficulty,
      chapters,
      totalScore,
      duration
    } = req.body;

    let aiAgent;
    if (aiAgentId) {
      aiAgent = await AIAgent.findById(aiAgentId).select('+apiKey');
    }

    if (!aiAgent) {
      aiAgent = await AIAgent.getDefaultAgent();
    }

    if (!aiAgent || !aiAgent.isActive) {
      return res.status(400).json({
        success: false,
        message: '请先配置可用的AI智能体'
      });
    }

    let generatedQuestions = [];
    
    if (aiAgent.type === 'api' && aiAgent.apiUrl && aiAgent.apiKey) {
      const systemPrompt = `你是一个专业的出题老师，请根据用户需求生成考试题目。
      要求：
      1. 题目类型可以是单选、多选、判断、填空、简答
      2. 每个题目需要有正确答案
      3. 单选题用JSON格式返回，包含title、type、options、correctAnswer、analysis字段
      4. 单选题type为'single'，多选题为'multiple'，判断题为'judge'，填空为'fill'，简答为'essay'
      5. 单选题和多选题的options是数组，每个元素包含key和content字段
      
      返回格式示例：
      {
        "questions": [
          {
            "title": "题目内容",
            "type": "single",
            "options": [
              {"key": "A", "content": "选项A"},
              {"key": "B", "content": "选项B"}
            ],
            "correctAnswer": "A",
            "analysis": "解析"
          }
        ]
      }`;

      const userPrompt = prompt || `请生成 ${questionCount || 10} 道题目。
      学科：${subject}
      难度：${difficulty || '中等'}
      ${chapters ? '章节：' + chapters.join(', ') : ''}
      ${description ? '要求：' + description : ''}`;

      try {
        const response = await axios.post(
          aiAgent.apiUrl,
          {
            model: aiAgent.model || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: aiAgent.systemPrompt || systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: aiAgent.temperature || 0.7,
            max_tokens: aiAgent.maxTokens || 2000
          },
          {
            headers: {
              'Authorization': `Bearer ${aiAgent.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        const content = response.data?.choices?.[0]?.message?.content || '';
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            generatedQuestions = parsed.questions || [];
          }
        } catch (parseError) {
          console.error('Parse AI response error:', parseError);
        }

        await aiAgent.incrementUsage();
      } catch (aiError) {
        console.error('AI API error:', aiError.message);
      }
    }

    if (generatedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'AI生成题目失败，请检查智能体配置或稍后重试'
      });
    }

    const createdQuestions = [];
    for (const q of generatedQuestions) {
      const question = await Question.create({
        title: q.title,
        type: q.type || 'single',
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        analysis: q.analysis || '',
        score: Math.floor((totalScore || 100) / generatedQuestions.length),
        subject: subject,
        difficulty: difficulty,
        chapters: chapters,
        createdBy: req.user._id
      });
      createdQuestions.push(question);
    }

    const exam = await Exam.create({
      title: title || `AI生成试卷 - ${new Date().toLocaleDateString()}`,
      description,
      subject,
      difficulty,
      chapters: chapters || [],
      type: 'practice',
      totalScore: totalScore || 100,
      duration: duration || 60,
      questions: createdQuestions.map((q, index) => ({
        question: q._id,
        score: q.score,
        order: index
      })),
      questionCount: createdQuestions.length,
      generatedByAI: true,
      aiAgent: aiAgent._id,
      aiPrompt: prompt,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'AI组卷成功',
      data: {
        exam: exam.toExamResponse(),
        generatedQuestions: createdQuestions.length
      }
    });
  } catch (error) {
    console.error('Generate exam by AI error:', error);
    res.status(500).json({
      success: false,
      message: 'AI组卷失败'
    });
  }
};

exports.batchDeleteExams = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要删除的试卷'
      });
    }

    const exams = await Exam.find({ _id: { $in: ids } });
    
    const unauthorized = exams.filter(e => 
      req.user.role !== 'admin' && e.createdBy.toString() !== req.user._id.toString()
    );

    if (unauthorized.length > 0) {
      return res.status(403).json({
        success: false,
        message: '部分试卷无权限删除'
      });
    }

    await Exam.updateMany(
      { _id: { $in: ids } },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: `成功删除 ${ids.length} 份试卷`
    });
  } catch (error) {
    console.error('Batch delete exams error:', error);
    res.status(500).json({
      success: false,
      message: '批量删除失败'
    });
  }
};