const mongoose = require('mongoose');

const AIAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请输入智能体名称'],
    trim: true,
    minlength: [2, '名称至少需要2个字符'],
    maxlength: [100, '名称不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  type: {
    type: String,
    enum: ['api', 'custom', 'builtin'],
    default: 'api',
    required: true
  },
  provider: {
    type: String,
    trim: true
  },
  apiUrl: {
    type: String,
    trim: true
  },
  apiKey: {
    type: String,
    trim: true,
    select: false
  },
  model: {
    type: String,
    trim: true
  },
  systemPrompt: {
    type: String,
    trim: true,
    default: ''
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2
  },
  maxTokens: {
    type: Number,
    default: 2000
  },
  capabilities: {
    type: [String],
    enum: ['generate_question', 'generate_exam', 'solve_question', 'analyze_answer'],
    default: ['generate_question', 'generate_exam', 'solve_question', 'analyze_answer']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

AIAgentSchema.index({ createdBy: 1, isActive: 1 });
AIAgentSchema.index({ isDefault: 1, isActive: 1 });

AIAgentSchema.statics.getDefaultAgent = async function() {
  return this.findOne({ isDefault: true, isActive: true });
};

AIAgentSchema.statics.getActiveAgents = async function(userId = null) {
  const query = { isActive: true };
  if (userId) {
    query.$or = [
      { createdBy: userId },
      { type: 'builtin' }
    ];
  }
  return this.find(query).sort({ isDefault: -1, createdAt: -1 });
};

AIAgentSchema.methods.toAgentResponse = function(includeApiKey = false) {
  const response = {
    id: this._id,
    name: this.name,
    description: this.description,
    type: this.type,
    provider: this.provider,
    apiUrl: this.apiUrl,
    model: this.model,
    systemPrompt: this.systemPrompt,
    temperature: this.temperature,
    maxTokens: this.maxTokens,
    capabilities: this.capabilities,
    isActive: this.isActive,
    isDefault: this.isDefault,
    usageCount: this.usageCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
  
  if (includeApiKey && this.apiKey) {
    response.apiKey = this.apiKey;
  }
  
  return response;
};

AIAgentSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

module.exports = mongoose.model('AIAgent', AIAgentSchema);