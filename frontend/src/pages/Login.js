import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Tabs, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../utils/constants';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login({
        identifier: values.identifier,
        password: values.password
      });

      if (result.success) {
        message.success('登录成功');
        navigate(from, { replace: true });
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const result = await register({
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role || 'student'
      });

      if (result.success) {
        message.success('注册成功');
        navigate(from, { replace: true });
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <Form
      name="login_form"
      initialValues={{ remember: true }}
      onFinish={handleLogin}
      size="large"
    >
      <Form.Item
        name="identifier"
        rules={[{ required: true, message: '请输入用户名或邮箱' }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="用户名或邮箱"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  );

  const registerForm = (
    <Form
      name="register_form"
      onFinish={handleRegister}
      size="large"
    >
      <Form.Item
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, max: 50, message: '用户名需要3-50个字符' }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="用户名"
        />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="邮箱"
        />
      </Form.Item>

      <Form.Item
        name="role"
        initialValue="student"
        rules={[{ required: true, message: '请选择角色' }]}
      >
        <Select placeholder="选择角色">
          {USER_ROLES.map(role => (
            <Select.Option key={role.value} value={role.value}>
              {role.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, max: 100, message: '密码需要6-100个字符' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            }
          })
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="确认密码"
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          注册
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: loginForm
    },
    {
      key: 'register',
      label: '注册',
      children: registerForm
    }
  ];

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-title">
          <h1>智题库</h1>
          <p>AI智能刷题平台</p>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          centered
        />
      </Card>
    </div>
  );
};

export default Login;