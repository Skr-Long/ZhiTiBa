import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Switch,
  InputNumber
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import AppLayout from '../components/Layout';
import {
  getUsers,
  createCategory,
  updateUser,
  deleteUser
} from '../services/userService';
import {
  USER_ROLES,
  USER_ROLE_MAP,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS
} from '../utils/constants';

const { Option } = Select;

const Users = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0
  });
  const [filters, setFilters] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.current, pagination.pageSize]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers(filters);
      setUsers(res.data?.users || []);
      setPagination(prev => ({
        ...prev,
        total: res.data?.count || 0
      }));
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (values) => {
    setFilters(values);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      ...record
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteUser(id);
      if (res.success) {
        message.success('删除成功');
        fetchUsers();
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const res = await updateUser(editingUser.id, values);
      if (res.success) {
        message.success('更新成功');
        setModalVisible(false);
        fetchUsers();
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200
    },
    {
      title: '真实姓名',
      dataIndex: 'realName',
      key: 'realName',
      width: 120
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => {
        let color = 'blue';
        if (role === 'admin') color = 'red';
        else if (role === 'teacher') color = 'purple';
        else color = 'green';
        return <Tag color={color}>{USER_ROLE_MAP[role]}</Tag>;
      }
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school',
      width: 150
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h2>用户管理</h2>
        </div>

        <Card className="card-shadow" style={{ marginBottom: 16 }}>
          <Form layout="inline" onFinish={handleSearch}>
            <Form.Item name="keyword" label="搜索">
              <Input placeholder="用户名/邮箱/姓名" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="role" label="角色">
              <Select placeholder="选择角色" style={{ width: 120 }} allowClear>
                {USER_ROLES.map(role => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="isActive" label="状态">
              <Select placeholder="选择状态" style={{ width: 120 }} allowClear>
                <Option value={true}>启用</Option>
                <Option value={false}>禁用</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
                  搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card className="card-shadow">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize }));
              },
              onShowSizeChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: 1, pageSize }));
              }
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        <Modal
          title="编辑用户"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={600}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            preserve={false}
          >
            <Form.Item label="用户名">
              <Input disabled value={editingUser?.username} />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input disabled value={editingUser?.email} />
            </Form.Item>
            <Form.Item name="realName" label="真实姓名">
              <Input placeholder="请输入真实姓名" />
            </Form.Item>
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select>
                {USER_ROLES.map(role => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="school" label="学校">
              <Input placeholder="请输入学校" />
            </Form.Item>
            <Form.Item name="grade" label="年级">
              <Input placeholder="请输入年级" />
            </Form.Item>
            <Form.Item name="isActive" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default Users;