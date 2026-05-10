import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs, message, Avatar } from 'antd';
import { UserOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import AppLayout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, changePassword } from '../services/userService';
import { USER_ROLE_MAP } from '../utils/constants';

const Profile = () => {
  const { user, updateUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    try {
      const response = await updateProfile(values);
      if (response.success) {
        updateUserInfo(response.data.user);
        message.success('个人信息更新成功');
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      if (response.success) {
        message.success('密码修改成功');
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error(error.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      icon: <UserOutlined />,
      children: (
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
            <h3 style={{ marginTop: 16 }}>{user?.realName || user?.username}</h3>
            <p style={{ color: '#8c8c8c' }}>
              {USER_ROLE_MAP[user?.role] || user?.role}
            </p>
          </div>

          <Form
            layout="vertical"
            initialValues={{
              realName: user?.realName || '',
              phone: user?.phone || '',
              school: user?.school || '',
              grade: user?.grade || ''
            }}
            onFinish={handleUpdateProfile}
          >
            <Form.Item label="用户名">
              <Input disabled value={user?.username} />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input disabled value={user?.email} />
            </Form.Item>
            <Form.Item name="realName" label="真实姓名">
              <Input placeholder="请输入真实姓名" />
            </Form.Item>
            <Form.Item 
              name="phone" 
              label="手机号"
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
            >
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item name="school" label="学校">
              <Input placeholder="请输入学校" />
            </Form.Item>
            <Form.Item name="grade" label="年级">
              <Input placeholder="请输入年级" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} icon={<EditOutlined />}>
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    },
    {
      key: 'password',
      label: '修改密码',
      icon: <LockOutlined />,
      children: (
        <Card>
          <Form
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="currentPassword"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password placeholder="请输入当前密码" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少需要6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入新密码（至少6位）" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  }
                })
              ]}
            >
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h2>个人中心</h2>
        </div>

        <Tabs items={tabItems} />
      </div>
    </AppLayout>
  );
};

export default Profile;