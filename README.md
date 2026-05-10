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

## 前置要求

1. **Node.js**：版本 >= 16
2. **MongoDB**：本地安装并运行，或使用 MongoDB Atlas

## 快速开始

### 1. 安装 MongoDB

确保 MongoDB 正在运行（默认端口 27017）

Windows 启动 MongoDB：
```bash
# 如果已安装为服务
net start MongoDB

# 或者手动启动
mongod
```

### 2. 安装依赖

在项目根目录执行：

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..
```

或者使用一条命令：
```bash
npm run install:all
```

### 3. 配置环境变量

后端已经默认配置好了环境变量（`backend/.env`），如果需要修改可以编辑：

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zhitibao
JWT_SECRET=zhitibao_jwt_secret_key_2024
JWT_EXPIRE=7d
NODE_ENV=development
```

### 4. 启动项目

**方式一：分别启动（推荐，方便调试）**

打开两个终端窗口：

**终端1 - 启动后端：**
```bash
cd backend
npm run dev
```
后端将在 http://localhost:5000 运行

**终端2 - 启动前端：**
```bash
cd frontend
npm start
```
前端将在 http://localhost:3000 运行

**方式二：同时启动**
```bash
npm run dev
```

### 5. 访问应用

- 前端地址：http://localhost:3000
- 后端API：http://localhost:5000

## 核心功能说明

### 用户系统

支持三种角色：
- **学生 (student)**：默认角色，可以刷题和查看题目
- **教师 (teacher)**：可以管理题目和分类
- **管理员 (admin)**：可以管理所有用户

### 题库管理

- 支持多种题型：单选、多选、填空、判断、简答
- 支持按学科、章节、难度分类
- 支持搜索和筛选
- 支持批量导入

### 分类管理

- **学科管理**：管理学科分类（如语文、数学、英语等）
- **章节管理**：管理章节，必须关联到学科
- **难度管理**：管理难度等级（如简单、中等、困难）

## API 文档

### 用户相关

- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/profile` - 更新个人信息
- `PUT /api/users/password` - 修改密码

### 题目相关

- `GET /api/questions` - 获取题目列表
- `POST /api/questions` - 创建题目
- `GET /api/questions/:id` - 获取题目详情
- `PUT /api/questions/:id` - 更新题目
- `DELETE /api/questions/:id` - 删除题目
- `POST /api/questions/import` - 批量导入题目

### 分类相关

- `GET /api/categories` - 获取分类列表
- `GET /api/categories/subjects` - 获取学科列表
- `GET /api/categories/chapters` - 获取章节列表
- `GET /api/categories/difficulties` - 获取难度列表
- `POST /api/categories` - 创建分类
- `PUT /api/categories/:id` - 更新分类
- `DELETE /api/categories/:id` - 删除分类

## 项目结构

```
ZhiTiBao/
├── backend/                    # 后端服务
│   ├── config/                 # 配置文件
│   │   └── database.js         # MongoDB连接配置
│   ├── controllers/            # 控制器
│   │   ├── userController.js   # 用户控制器
│   │   ├── questionController.js # 题目控制器
│   │   └── categoryController.js # 分类控制器
│   ├── middleware/             # 中间件
│   │   └── auth.js             # 认证和权限中间件
│   ├── models/                 # 数据模型
│   │   ├── User.js             # 用户模型
│   │   ├── Question.js         # 题目模型
│   │   └── Category.js         # 分类模型
│   ├── routes/                 # 路由
│   │   ├── users.js            # 用户路由
│   │   ├── questions.js        # 题目路由
│   │   └── categories.js       # 分类路由
│   ├── .env                    # 环境变量
│   ├── package.json            # 依赖配置
│   └── server.js               # 服务入口
│
├── frontend/                   # 前端应用
│   ├── public/
│   │   └── index.html          # HTML入口
│   ├── src/
│   │   ├── components/         # 公共组件
│   │   │   ├── Layout.js       # 布局组件
│   │   │   └── ProtectedRoute.js # 路由守卫
│   │   ├── contexts/           # 上下文
│   │   │   └── AuthContext.js  # 认证上下文
│   │   ├── pages/              # 页面组件
│   │   │   ├── Login.js        # 登录/注册页
│   │   │   ├── Home.js         # 首页/仪表盘
│   │   │   ├── Questions.js    # 题库管理页
│   │   │   ├── Categories.js   # 分类管理页
│   │   │   ├── Profile.js      # 个人中心页
│   │   │   └── Users.js        # 用户管理页（管理员）
│   │   ├── services/           # API服务
│   │   │   ├── api.js          # Axios实例
│   │   │   ├── userService.js  # 用户服务
│   │   │   ├── questionService.js # 题目服务
│   │   │   └── categoryService.js # 分类服务
│   │   ├── utils/              # 工具函数
│   │   │   ├── constants.js    # 常量定义
│   │   │   └── storage.js      # 本地存储
│   │   ├── App.js              # 应用主组件
│   │   ├── index.js            # 入口文件
│   │   └── index.css           # 全局样式
│   └── package.json            # 依赖配置
│
├── .env                        # 根目录环境变量
├── .env.example                # 环境变量示例
├── README.md                   # 项目文档
└── package.json                # 根目录依赖配置
```

## 常见问题

### 1. 连接 MongoDB 失败

确保 MongoDB 服务正在运行：
```bash
# Windows
net start MongoDB

# 检查端口
netstat -ano | findstr :27017
```

### 2. 前后端通信失败

- 确保后端已启动在 5000 端口
- 检查浏览器控制台是否有 CORS 错误
- 前端已经配置为直接访问 `http://localhost:5000/api`

### 3. 端口被占用

如果 5000 或 3000 端口被占用：
- 修改 `backend/.env` 中的 PORT
- 或者关闭占用端口的进程

## 下一步开发建议

1. **智能组卷系统**：核心亮点功能，帮助老师生成考试卷子
2. **多格式文件导入**：支持 Excel、Word、PDF 等格式导入题目
3. **AI智能解题**：集成大模型API，提供AI辅助解题
4. **练习记录和数据分析**：刷题记录、错题本、学习进度追踪
5. **试卷管理**：创建、管理、发布试卷
6. **答题系统**：在线答题、自动批改

## License

MIT