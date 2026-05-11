import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Popconfirm,
  message,
  Checkbox,
  Card,
  Row,
  Col,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import AppLayout from '../components/Layout';
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  testAgentConnection,
  setDefaultAgent,
  batchDeleteAgents
} from '../services/aiAgentService';

const { Option } = Select;
const { TextArea } = Input;

const AIAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form] = Form.useForm();
  const [testingId, setTestingId] = useState(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await getAgents({ page: 1, limit: 100 });
      if (response.success) {
        setAgents(response.data.agents);
      }
    } catch (error) {
      message.error(error.message || '获取AI智能体列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreate = () => {
    setEditingAgent(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'openai',
      model: 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
      isActive: true,
      capabilities: ['chat', 'question_generation']
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingAgent(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingAgent) {
        await updateAgent(editingAgent._id, values);
        message.success('AI智能体更新成功');
      } else {
        await createAgent(values);
        message.success('AI智能体创建成功');
      }
      setModalVisible(false);
      fetchAgents();
    } catch (error) {
      message.error(error.message || '保存失败');
    }
  };

  const handleDelete = async (id, isSystem) => {
    if (isSystem) {
      message.warning('内置AI智能体不能删除');
      return;
    }
    try {
      await deleteAgent(id);
      message.success('删除成功');
      fetchAgents();
    } catch (error) {
      message.error(error.message || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的AI智能体');
      return;
    }
    
    const systemAgents = agents.filter(a => a.isSystem && selectedRowKeys.includes(a._id));
    if (systemAgents.length > 0) {
      message.warning('选中的AI智能体中包含内置智能体，无法删除');
      return;
    }
    
    try {
      await batchDeleteAgents(selectedRowKeys);
      message.success(`成功删除 ${selectedRowKeys.length} 个AI智能体`);
      setSelectedRowKeys([]);
      fetchAgents();
    } catch (error) {
      message.error(error.message || '批量删除失败');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    try {
      const response = await testAgentConnection(id);
      if (response.success) {
        message.success('连接测试成功');
      }
    } catch (error) {
      message.error(error.message || '连接测试失败');
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAgent(id);
      message.success('已设置为默认智能体');
      fetchAgents();
    } catch (error) {
      message.error(error.message || '设置失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {text}
          {record.isSystem && <Tag color="gold">内置</Tag>}
          {record.isDefault && <Tag color="green">默认</Tag>}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          openai: 'OpenAI 兼容',
          custom: '自定义API',
          mock: '模拟'
        };
        return <Tag>{typeMap[type] || type}</Tag>;
      }
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model'
    },
    {
      title: '功能',
      dataIndex: 'capabilities',
      key: 'capabilities',
      render: (caps) => (
        <Space wrap>
          {caps?.map(cap => (
            <Tag key={cap} color="blue">
              {cap}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleTest(record._id)}
            loading={testingId === record._id}
            size="small"
          >
            测试
          </Button>
          {!record.isDefault && (
            <Button
              type="link"
              onClick={() => handleSetDefault(record._id)}
              size="small"
            >
              设为默认
            </Button>
          )}
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
          {!record.isSystem ? (
            <Popconfirm
              title="确认删除此AI智能体？"
              description="删除后无法恢复，确定要删除吗？"
              onConfirm={() => handleDelete(record._id, record.isSystem)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                删除
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title="内置AI智能体不能删除">
              <Button
                type="link"
                danger
                disabled
                icon={<DeleteOutlined />}
                size="small"
              >
                删除
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: record.isSystem,
      name: record.name
    })
  };

  const hasSelected = selectedRowKeys.length > 0;

  return (
    <AppLayout>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建AI智能体
          </Button>
          <Popconfirm
            title="确认批量删除？"
            description={`将删除选中的 ${selectedRowKeys.length} 个AI智能体，确定吗？内置智能体无法删除。`}
            onConfirm={handleBatchDelete}
            okText="确认"
            cancelText="取消"
            disabled={!hasSelected}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={!hasSelected}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        </Space>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={agents}
          loading={loading}
          rowSelection={rowSelection}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingAgent ? '编辑AI智能体' : '新建AI智能体'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="例如：我的OpenAI API" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select>
                  <Option value="openai">OpenAI 兼容</Option>
                  <Option value="custom">自定义API</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="apiUrl"
            label="API地址"
            rules={[{ required: true, message: '请输入API地址' }]}
          >
            <Input placeholder="例如：https://api.openai.com/v1/chat/completions" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="请输入API密钥" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="model"
                label="模型"
                rules={[{ required: true, message: '请输入模型名称' }]}
              >
                <Input placeholder="例如：gpt-3.5-turbo, gpt-4, claude-3" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxTokens"
                label="最大token数"
                initialValue={2000}
              >
                <InputNumber min={100} max={32000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="temperature"
            label="温度参数 (0-1)"
            initialValue={0.7}
          >
            <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="capabilities"
            label="功能"
            initialValue={['chat', 'question_generation']}
          >
            <Checkbox.Group>
              <Space>
                <Checkbox value="chat">聊天对话</Checkbox>
                <Checkbox value="question_generation">智能出题</Checkbox>
                <Checkbox value="question_solve">解题</Checkbox>
                <Checkbox value="analysis">题目分析</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            name="isActive"
            label="状态"
            valuePropName="checked"
            initialValue={true}
          >
            <Checkbox>启用此AI智能体</Checkbox>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default AIAgents;