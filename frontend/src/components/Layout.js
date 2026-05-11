import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  FolderOpenOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  FileTextOutlined,
  RobotOutlined,
  HistoryOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '首页',
      onClick: () => navigate('/')
    },
    {
      key: '/questions',
      icon: <BookOutlined />,
      label: '题库管理',
      onClick: () => navigate('/questions')
    },
    {
      key: '/categories',
      icon: <FolderOpenOutlined />,
      label: '分类管理',
      onClick: () => navigate('/categories')
    },
    {
      key: '/exams',
      icon: <FileTextOutlined />,
      label: '试卷管理',
      onClick: () => navigate('/exams')
    },
    {
      key: '/my-answers',
      icon: <HistoryOutlined />,
      label: '我的答卷',
      onClick: () => navigate('/my-answers')
    },
    {
      key: '/ai-agents',
      icon: <RobotOutlined />,
      label: 'AI智能体',
      onClick: () => navigate('/ai-agents')
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile')
    },
    ...(user?.role === 'admin' ? [{
      key: '/users',
      icon: <SettingOutlined />,
      label: '用户管理',
      onClick: () => navigate('/users')
    }] : [])
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ 
          height: 64, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold'
        }}>
          {collapsed ? 'ZT' : '智题库'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          />
          <Dropdown menu={{ items: userMenuItems }}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.realName || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;