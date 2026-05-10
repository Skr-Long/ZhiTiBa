# ZhiTiBao - AI智能刷题平台

一个集成AI智能解题的刷题平台，支持多格式文件导入，帮助学习者高效刷题并获得AI辅助。

## 核心功能

- **智能组卷系统**：帮助老师快速构思和生成课堂测验、月考等考试卷子
- **用户管理**：注册/登录/权限管理
- **题库管理**：题目增删改查
- **分类管理**：学科/章节/难度分类

## 技术栈

- 后端：Node.js + Express
- 前端：React
- 数据库：MongoDB

## 快速开始

### 安装依赖

```bash
npm run install:all
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置相关参数。

### 启动项目

```bash
npm run dev
```

## 项目结构

```
ZhiTiBao/
├── backend/           # 后端服务
│   ├── models/        # 数据模型
│   ├── routes/        # API路由
│   ├── controllers/   # 控制器
│   ├── middleware/    # 中间件
│   └── config/        # 配置文件
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
└── package.json
```