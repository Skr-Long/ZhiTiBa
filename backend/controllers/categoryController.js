const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const { type, parent, isActive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (parent) query.parent = parent;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const categories = await Category.find(query)
      .populate('parent', 'name type')
      .sort({ sort: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        categories: categories.map(cat => cat.toCategoryResponse()),
        count: categories.length
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Category.getSubjects();

    res.status(200).json({
      success: true,
      data: {
        subjects: subjects.map(cat => cat.toCategoryResponse()),
        count: subjects.length
      }
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      message: '获取学科列表失败'
    });
  }
};

exports.getChapters = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const chapters = await Category.getChapters(subjectId);

    res.status(200).json({
      success: true,
      data: {
        chapters: chapters.map(cat => cat.toCategoryResponse()),
        count: chapters.length
      }
    });
  } catch (error) {
    console.error('Get chapters error:', error);
    res.status(500).json({
      success: false,
      message: '获取章节列表失败'
    });
  }
};

exports.getDifficulties = async (req, res) => {
  try {
    const difficulties = await Category.getDifficulties();

    res.status(200).json({
      success: true,
      data: {
        difficulties: difficulties.map(cat => cat.toCategoryResponse()),
        count: difficulties.length
      }
    });
  } catch (error) {
    console.error('Get difficulties error:', error);
    res.status(500).json({
      success: false,
      message: '获取难度列表失败'
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name type');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category: category.toCategoryResponse()
      }
    });
  } catch (error) {
    console.error('Get category by id error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类信息失败'
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type, code, parent, description, sort, icon, color, isActive } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: '分类名称和类型不能为空'
      });
    }

    if (!['subject', 'chapter', 'difficulty'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的分类类型'
      });
    }

    if (type === 'chapter' && !parent) {
      return res.status(400).json({
        success: false,
        message: '章节分类必须指定所属学科'
      });
    }

    const category = await Category.create({
      name,
      type,
      code,
      parent,
      description,
      sort,
      icon,
      color,
      isActive,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: {
        category: category.toCategoryResponse()
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
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
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '分类代码已存在'
      });
    }
    res.status(500).json({
      success: false,
      message: '创建分类失败'
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, type, code, parent, description, sort, icon, color, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    if (req.user.role !== 'admin' && category.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '您没有权限修改此分类'
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, type, code, parent, description, sort, icon, color, isActive },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: '分类更新成功',
      data: {
        category: updatedCategory.toCategoryResponse()
      }
    });
  } catch (error) {
    console.error('Update category error:', error);
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
      message: '更新分类失败'
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    if (req.user.role !== 'admin' && category.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '您没有权限删除此分类'
      });
    }

    const Question = require('../models/Question');
    const questionsCount = await Question.countDocuments({
      $or: [
        { subject: category._id },
        { chapter: category._id },
        { difficulty: category._id }
      ]
    });

    if (questionsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下有 ${questionsCount} 道题目，请先处理这些题目`
      });
    }

    const childCategories = await Category.countDocuments({ parent: category._id });
    if (childCategories > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类下有 ${childCategories} 个子分类，请先处理这些子分类`
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败'
    });
  }
};