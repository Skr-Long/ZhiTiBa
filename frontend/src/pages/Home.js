import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, message } from 'antd';
import {
  BookOutlined,
  FolderOpenOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import AppLayout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getQuestions } from '../services/questionService';
import { getCategories } from '../services/categoryService';
import { getUsers } from '../services/userService';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';

const Home = () => {
  const [stats, setStats] = useState({
    questions: 0,
    subjects: 0,
    chapters: 0,
    difficulties: 0,
    users: 0
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [questionsRes, categoriesRes] = await Promise.all([
        getQuestions({ page: 1, limit: 1 }),
        getCategories({})
      ]);

      const questionCount = questionsRes.data?.pagination?.total || 0;
      const categories = categoriesRes.data?.categories || [];

      let usersCount = 0;
      if (user?.role === 'admin') {
        try {
          const usersRes = await getUsers({});
          usersCount = usersRes.data?.count || 0;
        } catch (e) {
          usersCount = 0;
        }
      }

      setStats({
        questions: questionCount,
        subjects: categories.filter(c => c.type === 'subject').length,
        chapters: categories.filter(c => c.type === 'chapter').length,
        difficulties: categories.filter(c => c.type === 'difficulty').length,
        users: usersCount
      });
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: '题目总数',
      value: stats.questions,
      icon: <BookOutlined />,
      color: '#1890ff'
    },
    {
      title: '学科数',
      value: stats.subjects,
      icon: <FolderOpenOutlined />,
      color: '#52c41a'
    },
    {
      title: '章节数',
      value: stats.chapters,
      icon: <FolderOpenOutlined />,
      color: '#722ed1'
    },
    {
      title: '难度等级',
      value: stats.difficulties,
      icon: <FolderOpenOutlined />,
      color: '#fa8c16'
    },
    ...(user?.role === 'admin' ? [{
      title: '用户数',
      value: stats.users,
      icon: <TeamOutlined />,
      color: '#eb2f96'
    }] : [])
  ];

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h2>仪表盘</h2>
        </div>

        <Row gutter={[16, 16]}>
          {statCards.map((card, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card className="card-shadow stat-card" loading={loading}>
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={
                    <span style={{ color: card.color }}>
                      {card.icon}
                    </span>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
            <Card className="card-shadow" title="欢迎使用智题库">
              <p>欢迎来到 AI 智能刷题平台！</p>
              <p>当前用户：{user?.realName || user?.username}</p>
              <p>角色：{user?.role === 'admin' ? '管理员' : user?.role === 'teacher' ? '教师' : '学生'}</p>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card className="card-shadow" title="快速操作">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="/questions">题库管理 →</a>
                <a href="/categories">分类管理 →</a>
                <a href="/profile">个人中心 →</a>
                {user?.role === 'admin' && (
                  <a href="/users">用户管理 →</a>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </AppLayout>
  );
};

export default Home;