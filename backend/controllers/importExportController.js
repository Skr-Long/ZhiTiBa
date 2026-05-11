const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const importExportService = require('../services/importExportService');
const Question = require('../models/Question');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/pdf',
    'text/markdown',
    'text/plain'
  ];
  
  const allowedExtensions = ['.json', '.xlsx', '.xls', '.docx', '.doc', '.pdf', '.md', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件格式'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
}).single('file');

exports.uploadFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `文件上传错误: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

exports.importQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    const userId = req.user._id;

    let result;

    try {
      switch (ext) {
        case '.json':
          result = await importExportService.importFromJSON(filePath, userId);
          break;
        case '.xlsx':
        case '.xls':
          result = await importExportService.importFromExcel(filePath, userId);
          break;
        case '.docx':
        case '.doc':
          result = await importExportService.importFromWord(filePath, userId);
          break;
        case '.pdf':
          result = await importExportService.importFromPDF(filePath, userId);
          break;
        case '.md':
        case '.markdown':
          result = await importExportService.importFromMarkdown(filePath, userId);
          break;
        case '.txt':
          const content = await fs.readFile(filePath, 'utf-8');
          const questions = importExportService.parseQuestionsFromText(content);
          result = await importExportService.processImportedQuestions(questions, userId);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `不支持的文件格式: ${ext}`
          });
      }

      await fs.remove(filePath);

      res.status(200).json({
        success: true,
        message: `导入完成，成功 ${result.success.length} 题，失败 ${result.errors.length} 题`,
        data: result
      });
    } catch (importError) {
      await fs.remove(filePath).catch(() => {});
      throw importError;
    }
  } catch (error) {
    console.error('Import questions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '导入失败，请稍后重试'
    });
  }
};

exports.exportQuestions = async (req, res) => {
  try {
    const { ids, format = 'json', subject, chapter, difficulty, type, keyword } = req.query;
    
    let questionIds;
    
    if (ids) {
      questionIds = Array.isArray(ids) ? ids : ids.split(',').map(id => id.trim());
    } else {
      const query = { isActive: true };
      if (subject) query.subject = subject;
      if (chapter) query.chapter = chapter;
      if (difficulty) query.difficulty = difficulty;
      if (type) query.type = type;
      if (keyword) {
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { analysis: { $regex: keyword, $options: 'i' } }
        ];
      }
      
      const questions = await Question.find(query).select('_id');
      questionIds = questions.map(q => q._id);
    }

    if (!questionIds || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导出的题目'
      });
    }

    if (format === 'excel' || format === 'xlsx') {
      await importExportService.exportToExcel(questionIds, res);
    } else {
      await importExportService.exportToJSON(questionIds, res);
    }
  } catch (error) {
    console.error('Export questions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '导出失败，请稍后重试'
    });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const { format = 'excel' } = req.query;
    
    if (format === 'json') {
      const template = {
        questions: [
          {
            title: '1 + 1 = ?',
            type: 'single',
            options: [
              { key: 'A', content: '1' },
              { key: 'B', content: '2' },
              { key: 'C', content: '3' },
              { key: 'D', content: '4' }
            ],
            correctAnswer: 'B',
            analysis: '1 + 1 = 2',
            score: 10,
            subject: '数学',
            chapter: '第一章',
            difficulty: '简单',
            tags: ['加法', '基础'],
            source: '课本'
          },
          {
            title: '地球是圆的吗？',
            type: 'judge',
            correctAnswer: '对',
            analysis: '地球是一个椭球体',
            score: 5,
            subject: '地理',
            difficulty: '简单'
          }
        ]
      };
      
      const jsonData = JSON.stringify(template, null, 2);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=questions_template.json');
      res.send(jsonData);
    } else {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('题目模板');
      
      worksheet.columns = [
        { header: '题型', key: 'type', width: 12 },
        { header: '题目内容', key: 'title', width: 60 },
        { header: '选项A', key: 'optionA', width: 40 },
        { header: '选项B', key: 'optionB', width: 40 },
        { header: '选项C', key: 'optionC', width: 40 },
        { header: '选项D', key: 'optionD', width: 40 },
        { header: '正确答案', key: 'correctAnswer', width: 20 },
        { header: '解析', key: 'analysis', width: 60 },
        { header: '分值', key: 'score', width: 8 },
        { header: '学科', key: 'subject', width: 12 },
        { header: '章节', key: 'chapter', width: 15 },
        { header: '难度', key: 'difficulty', width: 10 },
        { header: '标签', key: 'tags', width: 30 },
        { header: '来源', key: 'source', width: 20 }
      ];
      
      worksheet.addRow({
        type: '单选题',
        title: '1 + 1 = ?',
        optionA: '1',
        optionB: '2',
        optionC: '3',
        optionD: '4',
        correctAnswer: 'B',
        analysis: '1 + 1 = 2',
        score: 10,
        subject: '数学',
        chapter: '第一章',
        difficulty: '简单',
        tags: '加法, 基础',
        source: '课本'
      });
      
      worksheet.getRow(1).font = { bold: true };
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=questions_template.xlsx');
      
      await workbook.xlsx.write(res);
    }
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: '获取模板失败'
    });
  }
};