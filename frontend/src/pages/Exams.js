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
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/Layout';
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  publishExam,
  unpublishExam,
  generateExamByChapters,
  generateExamByAI,
  batchDeleteExams
} from '../services/examService';
import { getCategories } from '../services/categoryService';
import { getQuestions } from '../services/questionService';
import { getAgents } from '../services/aiAgentService';

const { Option } = Select;
const { TextArea } = Input;

const Exams = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();
  const [categories, setCategories] = useState({ subjects: [], chapters: [] });
  const [agents, setAgents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchExams = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await getExams({ page, pageSize });
      if (response.success) {
        setExams(response.data.exams);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      message.error(error.message || '获取试卷列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const [subjectsRes, chaptersRes] = await Promise.all([
        getCategories({ type: 'subject' }),
        getCategories({ type: 'chapter' })
      ]);
      setCategories({
        subjects: subjectsRes.data?.categories || [],
        chapters: chaptersRes.data?.categories || []
      });
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await getAgents({ page: 1, limit: 100 });
      if (response.success) {
        setAgents(response.data.agents);
      }
    } catch (error) {
      console.error('获取AI智能体失败:', error);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchCategories();
    fetchAgents();
  }, []);

  const handleCreate = () => {
    setEditingExam(null);
    form.resetFields();
    form.setFieldsValue({
      totalScore: 100,
      duration: 60,
      maxAttempts: 1,
      settings: ['allowRetry', 'showAnswerAfterSubmit', 'showScoreAfterSubmit']
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingExam(record);
    const settings = record.settings;
    let settingsArray = [];
    if (settings) {
      if (Array.isArray(settings)) {
        settingsArray = settings;
      } else if (typeof settings === 'object') {
        settingsArray = Object.entries(settings)
          .filter(([key, value]) => value === true)
          .map(([key]) => key);
      }
    }
    const idKey = record.id || record._id;
    form.setFieldsValue({
      ...record,
      id: idKey,
      _id: idKey,
      subject: record.subject?.id || record.subject?._id || record.subject,
      settings: settingsArray
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = { ...values };
      const settingsArray = values.settings || [];
      submitData.settings = {
        shuffleQuestions: settingsArray.includes('shuffleQuestions'),
        shuffleOptions: settingsArray.includes('shuffleOptions'),
        allowRetry: settingsArray.includes('allowRetry'),
        showAnswerAfterSubmit: settingsArray.includes('showAnswerAfterSubmit'),
        showScoreAfterSubmit: settingsArray.includes('showScoreAfterSubmit')
      };

      if (editingExam) {
        await updateExam(editingExam.id || editingExam._id, submitData);
        message.success('试卷更新成功');
      } else {
        await createExam(submitData);
        message.success('试卷创建成功');
      }
      setModalVisible(false);
      fetchExams(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.message || '保存试卷失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExam(id);
      message.success('删除成功');
      fetchExams(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.message || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的试卷');
      return;
    }
    try {
      await batchDeleteExams(selectedRowKeys);
      message.success(`成功删除 ${selectedRowKeys.length} 份试卷`);
      setSelectedRowKeys([]);
      fetchExams(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.message || '批量删除失败');
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishExam(id);
      message.success('发布成功');
      fetchExams(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.message || '发布失败');
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await unpublishExam(id);
      message.success('已取消发布');
      fetchExams(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.message || '操作失败');
    }
  };

  const handleGenerate = () => {
    generateForm.resetFields();
    setGenerateModalVisible(true);
  };

  const handleGenerateSubmit = async (values) => {
    try {
      if (values.mode === 'chapter') {
        const response = await generateExamByChapters({
          ...values,
          chapters: values.chapters || []
        });
        if (response.success) {
          message.success('试卷生成成功');
          setGenerateModalVisible(false);
          fetchExams();
        }
      } else if (values.mode === 'ai') {
        const response = await generateExamByAI(values);
        if (response.success) {
          message.success('AI智能组卷成功');
          setGenerateModalVisible(false);
          fetchExams();
        }
      }
    } catch (error) {
      message.error(error.message || '生成试卷失败');
    }
  };

  const columns = [
    {
      title: '试卷名称',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '学科',
      dataIndex: ['subject', 'name'],
      key: 'subject',
      render: (text) => text || '-'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          manual: '手动组卷',
          chapter: '章节组卷',
          ai: 'AI智能组卷'
        };
        return <Tag color="blue">{typeMap[type] || type}</Tag>;
      }
    },
    {
      title: '题目数',
      dataIndex: 'questionCount',
      key: 'questionCount'
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore'
    },
    {
      title: '状态',
      dataIndex: 'isPublished',
      key: 'isPublished',
      render: (published) => (
        <Tag color={published ? 'green' : 'orange'}>
          {published ? '已发布' : '未发布'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const id = record.id || record._id;
        return (
          <Space size="middle">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            {record.isPublished ? (
              <Button
                type="link"
                icon={<PauseCircleOutlined />}
                onClick={() => handleUnpublish(id)}
              >
                取消发布
              </Button>
            ) : (
              <Button
                type="link"
                icon={<PlayCircleOutlined />}
                onClick={() => handlePublish(id)}
              >
                发布
              </Button>
            )}
            <Popconfirm
              title="确认删除此试卷？"
              description="删除后无法恢复，确定要删除吗？"
              onConfirm={() => handleDelete(id)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys
  };

  return (
    <AppLayout>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建试卷
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleGenerate}
          >
            智能组卷
          </Button>
          <Popconfirm
            title="确认批量删除？"
            description={`将删除选中的 ${selectedRowKeys.length} 份试卷，确定吗？`}
            onConfirm={handleBatchDelete}
            okText="确认"
            cancelText="取消"
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        </Space>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={exams}
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      </Card>

      <Modal
        title={editingExam ? '编辑试卷' : '新建试卷'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="试卷名称"
                rules={[{ required: true, message: '请输入试卷名称' }]}
              >
                <Input placeholder="请输入试卷名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="subject"
                label="学科"
                rules={[{ required: true, message: '请选择学科' }]}
              >
                <Select placeholder="请选择学科">
                  {categories.subjects.map(sub => (
                    <Option key={sub.id} value={sub.id}>{sub.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="试卷描述"
          >
            <TextArea rows={3} placeholder="请输入试卷描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="totalScore"
                label="总分"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="duration"
                label="考试时长(分钟)"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxAttempts"
                label="最多尝试次数"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>题目设置</Divider>
          
          <Form.Item
            label="设置选项"
            name="settings"
          >
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="shuffleQuestions">随机排列题目</Checkbox>
                <Checkbox value="shuffleOptions">随机排列选项</Checkbox>
                <Checkbox value="allowRetry">允许重考</Checkbox>
                <Checkbox value="showAnswerAfterSubmit">提交后显示答案</Checkbox>
                <Checkbox value="showScoreAfterSubmit">提交后显示分数</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="智能组卷"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={handleGenerateSubmit}
        >
          <Form.Item
            name="mode"
            label="组卷方式"
            initialValue="chapter"
            rules={[{ required: true, message: '请选择组卷方式' }]}
          >
            <Select>
              <Option value="chapter">按章节组卷</Option>
              <Option value="ai">AI智能组卷</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="试卷名称"
            rules={[{ required: true, message: '请输入试卷名称' }]}
          >
            <Input placeholder="请输入试卷名称" />
          </Form.Item>

          <Form.Item
            name="subject"
            label="学科"
            rules={[{ required: true, message: '请选择学科' }]}
          >
            <Select placeholder="请选择学科">
              {categories.subjects.map(sub => (
                <Option key={sub._id} value={sub._id}>{sub.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.mode !== curr.mode}
          >
            {({ getFieldValue }) => {
              const mode = getFieldValue('mode');
              
              if (mode === 'chapter') {
                return (
                  <>
                    <Form.Item
                      name="chapters"
                      label="选择章节"
                      rules={[{ required: true, message: '请选择章节' }]}
                    >
                      <Select mode="multiple" placeholder="请选择章节">
                        {categories.chapters.map(ch => (
                          <Option key={ch.id} value={ch.id}>{ch.name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      name="totalScore"
                      label="总分"
                      initialValue={100}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                );
              }
              
              if (mode === 'ai') {
                return (
                  <>
                    <Form.Item
                      name="aiAgent"
                      label="选择AI智能体"
                      rules={[{ required: true, message: '请选择AI智能体' }]}
                    >
                      <Select placeholder="请选择AI智能体">
                        {agents.map(agent => (
                          <Option key={agent.id} value={agent.id}>{agent.name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      name="topic"
                      label="考试主题"
                      rules={[{ required: true, message: '请输入考试主题' }]}
                    >
                      <Input placeholder="例如：高等数学第一章极限" />
                    </Form.Item>
                    
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          name="questionCount"
                          label="题目数量"
                          initialValue={10}
                        >
                          <InputNumber min={1} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="totalScore"
                          label="总分"
                          initialValue={100}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="difficulty"
                          label="难度"
                          initialValue="medium"
                        >
                          <Select>
                            <Option value="easy">简单</Option>
                            <Option value="medium">中等</Option>
                            <Option value="hard">困难</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Form.Item
                      name="questionTypes"
                      label="题型"
                      initialValue={['single', 'multiple', 'judge']}
                    >
                      <Checkbox.Group>
                        <Space>
                          <Checkbox value="single">单选题</Checkbox>
                          <Checkbox value="multiple">多选题</Checkbox>
                          <Checkbox value="judge">判断题</Checkbox>
                          <Checkbox value="fill">填空题</Checkbox>
                        </Space>
                      </Checkbox.Group>
                    </Form.Item>
                  </>
                );
              }
              
              return null;
            }}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">生成试卷</Button>
              <Button onClick={() => setGenerateModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default Exams;