const AIAgent = require('../models/AIAgent');
const axios = require('axios');

exports.getAgents = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (req.user.role !== 'admin') {
      query.$or = [
        { createdBy: req.user._id },
        { type: 'builtin' }
      ];
    }

    const agents = await AIAgent.find(query)
      .populate('createdBy', 'username realName')
      .sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        agents: agents.map(agent => agent.toAgentResponse()),
        count: agents.length
      }
    });
  } catch (error) {
    console.error('Get AI agents error:', error);
    res.status(500).json({
      success: false,
      message: '获取AI智能体列表失败'
    });
  }
};

exports.getAgentById = async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id)
      .populate('createdBy', 'username realName');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'AI智能体不存在'
      });
    }

    if (req.user.role !== 'admin' && 
        agent.type !== 'builtin' && 
        agent.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此AI智能体'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        agent: agent.toAgentResponse(req.user.role === 'admin')
      }
    });
  } catch (error) {
    console.error('Get AI agent by id error:', error);
    res.status(500).json({
      success: false,
      message: '获取AI智能体信息失败'
    });
  }
};

exports.createAgent = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      provider,
      apiUrl,
      apiKey,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      capabilities,
      isActive,
      isDefault
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '智能体名称不能为空'
      });
    }

    if (type === 'api' && (!apiUrl || !apiKey)) {
      return res.status(400).json({
        success: false,
        message: 'API类型智能体需要配置API地址和密钥'
      });
    }

    if (isDefault) {
      await AIAgent.updateMany(
        { createdBy: req.user._id, isDefault: true },
        { isDefault: false }
      );
    }

    const agent = await AIAgent.create({
      name,
      description,
      type: type || 'api',
      provider,
      apiUrl,
      apiKey,
      model,
      systemPrompt: systemPrompt || '',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens || 2000,
      capabilities: capabilities || ['generate_question', 'generate_exam', 'solve_question', 'analyze_answer'],
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'AI智能体创建成功',
      data: {
        agent: agent.toAgentResponse()
      }
    });
  } catch (error) {
    console.error('Create AI agent error:', error);
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
      message: '创建AI智能体失败'
    });
  }
};

exports.updateAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'AI智能体不存在'
      });
    }

    if (req.user.role !== 'admin' && 
        agent.type !== 'builtin' && 
        agent.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限修改此AI智能体'
      });
    }

    if (agent.type === 'builtin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '内置智能体只能由管理员修改'
      });
    }

    const { isDefault, apiKey, ...updateData } = req.body;

    if (isDefault) {
      await AIAgent.updateMany(
        { createdBy: req.user._id, isDefault: true },
        { isDefault: false }
      );
      updateData.isDefault = true;
    }

    if (apiKey) {
      updateData.apiKey = apiKey;
    }

    const updatedAgent = await AIAgent.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'AI智能体更新成功',
      data: {
        agent: updatedAgent.toAgentResponse()
      }
    });
  } catch (error) {
    console.error('Update AI agent error:', error);
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
      message: '更新AI智能体失败'
    });
  }
};

exports.deleteAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'AI智能体不存在'
      });
    }

    if (agent.type === 'builtin') {
      return res.status(403).json({
        success: false,
        message: '内置智能体不允许删除'
      });
    }

    if (req.user.role !== 'admin' && 
        agent.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限删除此AI智能体'
      });
    }

    await AIAgent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'AI智能体删除成功'
    });
  } catch (error) {
    console.error('Delete AI agent error:', error);
    res.status(500).json({
      success: false,
      message: '删除AI智能体失败'
    });
  }
};

exports.setDefaultAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'AI智能体不存在'
      });
    }

    if (req.user.role !== 'admin' && 
        agent.type !== 'builtin' && 
        agent.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权限设置此AI智能体为默认'
      });
    }

    await AIAgent.updateMany(
      { createdBy: req.user._id, isDefault: true },
      { isDefault: false }
    );

    agent.isDefault = true;
    await agent.save();

    res.status(200).json({
      success: true,
      message: '默认AI智能体设置成功',
      data: {
        agent: agent.toAgentResponse()
      }
    });
  } catch (error) {
    console.error('Set default agent error:', error);
    res.status(500).json({
      success: false,
      message: '设置默认AI智能体失败'
    });
  }
};

exports.testAgentConnection = async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id).select('+apiKey');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'AI智能体不存在'
      });
    }

    if (agent.type === 'custom' || agent.type === 'builtin') {
      return res.status(200).json({
        success: true,
        message: '连接测试成功（内置/自定义类型）',
        data: { connected: true }
      });
    }

    if (!agent.apiUrl || !agent.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API配置不完整'
      });
    }

    const testPrompt = '请回复"测试成功"两个字，不要添加任何其他内容。';
    
    let response;
    try {
      const requestBody = {
        model: agent.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: agent.systemPrompt || '你是一个有帮助的AI助手。' },
          { role: 'user', content: testPrompt }
        ],
        temperature: 0.1,
        max_tokens: agent.maxTokens || 100
      };

      response = await axios.post(
        agent.apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const isConnected = response.data && (
        response.data.choices ||
        response.data.message ||
        response.data.content
      );

      await agent.incrementUsage();

      res.status(200).json({
        success: true,
        message: '连接测试成功',
        data: {
          connected: true,
          response: response.data?.choices?.[0]?.message?.content || '连接成功'
        }
      });
    } catch (apiError) {
      console.error('API connection test error:', apiError.message);
      res.status(400).json({
        success: false,
        message: `连接测试失败: ${apiError.message}`,
        data: { connected: false }
      });
    }
  } catch (error) {
    console.error('Test agent connection error:', error);
    res.status(500).json({
      success: false,
      message: '连接测试失败'
    });
  }
};