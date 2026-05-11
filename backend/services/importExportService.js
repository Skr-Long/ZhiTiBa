const fs = require('fs-extra');
const path = require('path');
const ExcelJS = require('exceljs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const MarkdownIt = require('markdown-it');
const Question = require('../models/Question');
const Category = require('../models/Category');

const md = new MarkdownIt();

const QUESTION_TYPE_MAP = {
  '单选': 'single',
  '单选题': 'single',
  'single': 'single',
  '多选': 'multiple',
  '多选题': 'multiple',
  'multiple': 'multiple',
  '填空': 'fill',
  '填空题': 'fill',
  'fill': 'fill',
  '判断': 'judge',
  '判断题': 'judge',
  'judge': 'judge',
  '简答': 'essay',
  '简答题': 'essay',
  'essay': 'essay'
};

exports.importFromJSON = async (filePath, userId) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const questions = Array.isArray(data) ? data : data.questions || [];
    
    return await this.processImportedQuestions(questions, userId);
  } catch (error) {
    console.error('Import from JSON error:', error);
    throw new Error(`JSON导入失败: ${error.message}`);
  }
};

exports.importFromExcel = async (filePath, userId) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    const questions = [];
    
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString().toLowerCase() || '';
    });
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const question = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        const value = cell.value?.toString() || '';
        
        switch (header) {
          case 'title':
          case '题目':
          case '题目内容':
            question.title = value;
            break;
          case 'type':
          case '题型':
          case '类型':
            question.type = QUESTION_TYPE_MAP[value] || value;
            break;
          case 'correctanswer':
          case '正确答案':
          case '答案':
            question.correctAnswer = value;
            break;
          case 'analysis':
          case '解析':
          case '题目解析':
            question.analysis = value;
            break;
          case 'score':
          case '分值':
          case '分数':
            question.score = parseInt(value) || 10;
            break;
          case 'subject':
          case '学科':
          case '科目':
            question.subjectName = value;
            break;
          case 'chapter':
          case '章节':
            question.chapterName = value;
            break;
          case 'difficulty':
          case '难度':
          case '难度等级':
            question.difficultyName = value;
            break;
          case 'options':
          case '选项':
            try {
              question.options = JSON.parse(value);
            } catch {
              question.options = this.parseOptionsFromString(value);
            }
            break;
          case 'a':
          case '选项a':
            if (!question.options) question.options = [];
            question.options[0] = { key: 'A', content: value };
            break;
          case 'b':
          case '选项b':
            if (!question.options) question.options = [];
            question.options[1] = { key: 'B', content: value };
            break;
          case 'c':
          case '选项c':
            if (!question.options) question.options = [];
            question.options[2] = { key: 'C', content: value };
            break;
          case 'd':
          case '选项d':
            if (!question.options) question.options = [];
            question.options[3] = { key: 'D', content: value };
            break;
          case 'tags':
          case '标签':
            question.tags = value.split(/[,，]/).map(t => t.trim()).filter(t => t);
            break;
          case 'source':
          case '来源':
          case '题目来源':
            question.source = value;
            break;
        }
      });
      
      if (question.title) {
        questions.push(question);
      }
    });
    
    return await this.processImportedQuestions(questions, userId);
  } catch (error) {
    console.error('Import from Excel error:', error);
    throw new Error(`Excel导入失败: ${error.message}`);
  }
};

exports.importFromWord = async (filePath, userId) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    const questions = this.parseQuestionsFromText(text);
    return await this.processImportedQuestions(questions, userId);
  } catch (error) {
    console.error('Import from Word error:', error);
    throw new Error(`Word导入失败: ${error.message}`);
  }
};

exports.importFromPDF = async (filePath, userId) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;
    
    const questions = this.parseQuestionsFromText(text);
    return await this.processImportedQuestions(questions, userId);
  } catch (error) {
    console.error('Import from PDF error:', error);
    throw new Error(`PDF导入失败: ${error.message}`);
  }
};

exports.importFromMarkdown = async (filePath, userId) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const questions = this.parseQuestionsFromMarkdown(content);
    return await this.processImportedQuestions(questions, userId);
  } catch (error) {
    console.error('Import from Markdown error:', error);
    throw new Error(`Markdown导入失败: ${error.message}`);
  }
};

exports.parseQuestionsFromText = (text) => {
  const questions = [];
  const questionBlocks = text.split(/\n\n+(?=\d+[.、])|\\n\\n+(?=【)|\\n\\n+(?=Q:)/);
  
  for (const block of questionBlocks) {
    const question = this.parseSingleQuestion(block);
    if (question && question.title) {
      questions.push(question);
    }
  }
  
  return questions;
};

exports.parseSingleQuestion = (text) => {
  const question = {};
  
  const lines = text.trim().split('\\n');
  
  let content = '';
  const optionRegex = /^([A-Z])[.、]\s*(.+)$/;
  const answerRegex = /^(答案|正确答案|Answer)[：:]\s*(.+)$/i;
  const analysisRegex = /^(解析|分析|Analysis)[：:]\s*(.+)$/i;
  const typeRegex = /【(单选|多选|填空|判断|简答)题?】/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const typeMatch = trimmed.match(typeRegex);
    if (typeMatch) {
      question.type = QUESTION_TYPE_MAP[typeMatch[1]];
      continue;
    }
    
    const answerMatch = trimmed.match(answerRegex);
    if (answerMatch) {
      question.correctAnswer = answerMatch[2].trim();
      continue;
    }
    
    const analysisMatch = trimmed.match(analysisRegex);
    if (analysisMatch) {
      question.analysis = analysisMatch[2].trim();
      continue;
    }
    
    const optionMatch = trimmed.match(optionRegex);
    if (optionMatch) {
      if (!question.options) question.options = [];
      question.options.push({
        key: optionMatch[1],
        content: optionMatch[2].trim()
      });
      continue;
    }
    
    const cleanLine = trimmed.replace(/^\d+[.、]\s*/, '');
    if (cleanLine && !question.title) {
      question.title = cleanLine;
    } else if (cleanLine) {
      if (!question.analysis && !question.correctAnswer) {
        question.title = (question.title || '') + ' ' + cleanLine;
      }
    }
  }
  
  if (!question.type) {
    if (question.options && question.options.length > 0) {
      question.type = 'single';
    } else {
      question.type = 'essay';
    }
  }
  
  return question;
};

exports.parseQuestionsFromMarkdown = (content) => {
  const questions = [];
  const blocks = content.split(/^###\s+/m).slice(1);
  
  for (const block of blocks) {
    const lines = block.trim().split('\\n');
    const question = {
      title: lines[0]?.trim() || '',
      options: [],
      type: 'single'
    };
    
    let inOptions = false;
    let inAnswer = false;
    let inAnalysis = false;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (/^(-\s+)?答案[:：]/.test(line)) {
        inAnswer = true;
        inOptions = false;
        inAnalysis = false;
        question.correctAnswer = line.replace(/^(-\s+)?答案[:：]\s*/, '').trim();
        continue;
      }
      
      if (/^(-\s+)?解析[:：]/.test(line)) {
        inAnalysis = true;
        inOptions = false;
        inAnswer = false;
        question.analysis = line.replace(/^(-\s+)?解析[:：]\s*/, '').trim();
        continue;
      }
      
      const optionMatch = line.match(/^(-\s+)?([A-Z])[.、]\s*(.+)$/);
      if (optionMatch || (line.startsWith('- ') && !line.includes('答案') && !line.includes('解析'))) {
        inOptions = true;
        if (optionMatch) {
          question.options.push({
            key: optionMatch[2],
            content: optionMatch[3]
          });
        }
        continue;
      }
      
      if (inAnswer) {
        question.correctAnswer = (question.correctAnswer || '') + ' ' + line;
      }
      
      if (inAnalysis) {
        question.analysis = (question.analysis || '') + ' ' + line;
      }
    }
    
    if (question.title) {
      if (!question.type && question.options && question.options.length > 0) {
        question.type = question.correctAnswer?.length > 1 ? 'multiple' : 'single';
      }
      questions.push(question);
    }
  }
  
  return questions;
};

exports.parseOptionsFromString = (str) => {
  const options = [];
  const optionRegex = /([A-Z])[.、]([^A-Z]+)/g;
  let match;
  
  while ((match = optionRegex.exec(str)) !== null) {
    options.push({
      key: match[1],
      content: match[2].trim()
    });
  }
  
  return options;
};

exports.processImportedQuestions = async (questions, userId) => {
  const results = {
    success: [],
    errors: [],
    total: questions.length
  };
  
  for (let i = 0; i < questions.length; i++) {
    try {
      const q = questions[i];
      
      if (!q.title || !q.title.trim()) {
        results.errors.push({ index: i, message: '题目内容为空' });
        continue;
      }
      
      const questionData = {
        title: q.title.trim(),
        type: q.type || 'single',
        correctAnswer: q.correctAnswer || '',
        analysis: q.analysis || '',
        score: q.score || 10,
        options: q.options || [],
        tags: q.tags || [],
        source: q.source || '',
        createdBy: userId
      };
      
      if (q.subjectName) {
        let subject = await Category.findOne({ name: q.subjectName, type: 'subject' });
        if (!subject) {
          subject = await Category.create({
            name: q.subjectName,
            type: 'subject',
            createdBy: userId
          });
        }
        questionData.subject = subject._id;
      }
      
      if (q.chapterName) {
        let chapter = await Category.findOne({ name: q.chapterName, type: 'chapter' });
        if (!chapter && questionData.subject) {
          chapter = await Category.create({
            name: q.chapterName,
            type: 'chapter',
            parent: questionData.subject,
            createdBy: userId
          });
        }
        if (chapter) {
          questionData.chapter = chapter._id;
        }
      }
      
      if (q.difficultyName) {
        let difficulty = await Category.findOne({ name: q.difficultyName, type: 'difficulty' });
        if (!difficulty) {
          difficulty = await Category.create({
            name: q.difficultyName,
            type: 'difficulty',
            createdBy: userId
          });
        }
        questionData.difficulty = difficulty._id;
      }
      
      const question = await Question.create(questionData);
      results.success.push(question._id);
    } catch (error) {
      results.errors.push({ index: i, message: error.message });
    }
  }
  
  return results;
};

exports.exportToJSON = async (questionIds, res) => {
  try {
    const questions = await Question.find({ _id: { $in: questionIds } })
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name');
    
    const exportData = questions.map(q => ({
      title: q.title,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      analysis: q.analysis,
      score: q.score,
      subject: q.subject?.name,
      chapter: q.chapter?.name,
      difficulty: q.difficulty?.name,
      tags: q.tags,
      source: q.source,
      knowledgePoints: q.knowledgePoints
    }));
    
    const jsonData = JSON.stringify({ questions: exportData }, null, 2);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=questions_${Date.now()}.json`);
    res.send(jsonData);
    
    return true;
  } catch (error) {
    console.error('Export to JSON error:', error);
    throw error;
  }
};

exports.exportToExcel = async (questionIds, res) => {
  try {
    const questions = await Question.find({ _id: { $in: questionIds } })
      .populate('subject', 'name')
      .populate('chapter', 'name')
      .populate('difficulty', 'name');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('题目');
    
    worksheet.columns = [
      { header: '序号', key: 'index', width: 8 },
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
    
    const typeLabelMap = {
      single: '单选题',
      multiple: '多选题',
      fill: '填空题',
      judge: '判断题',
      essay: '简答题',
      other: '其他'
    };
    
    questions.forEach((q, index) => {
      const options = q.options || [];
      worksheet.addRow({
        index: index + 1,
        type: typeLabelMap[q.type] || q.type,
        title: q.title,
        optionA: options[0]?.content || '',
        optionB: options[1]?.content || '',
        optionC: options[2]?.content || '',
        optionD: options[3]?.content || '',
        correctAnswer: q.correctAnswer,
        analysis: q.analysis,
        score: q.score,
        subject: q.subject?.name || '',
        chapter: q.chapter?.name || '',
        difficulty: q.difficulty?.name || '',
        tags: q.tags?.join(', ') || '',
        source: q.source || ''
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=questions_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    
    return true;
  } catch (error) {
    console.error('Export to Excel error:', error);
    throw error;
  }
};