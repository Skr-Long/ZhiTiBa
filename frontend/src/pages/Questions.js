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
  Row,
  Col,
  InputNumber,
  Switch,
  Divider,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import AppLayout from '../components/Layout';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../services/questionService';
import {
  getSubjects,
  getChapters,
  getDifficulties
} from '../services/categoryService';
import {
  QUESTION_TYPES,
  QUESTION_TYPE_MAP,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS
} from '../utils/constants';

const { Option } = Select;
const { TextArea } = Input;

const Questions = () => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0
  });
  const [filters, setFilters] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [difficulties, setDifficulties] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [filters, pagination.current, pagination.pageSize]);

  const fetchCategories = async () => {
    try {
      const [subjectsRes, difficultiesRes] = await Promise.all([
        getSubjects(),
        getDifficulties()
      ]);
      setSubjects(subjectsRes.data?.subjects || []);
      setDifficulties(difficultiesRes.data?.difficulties || []);
    } catch (error) {
      message.error('获取分类数据失败');
    }
  };

  const fetchChapters = async (subjectId) => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    try {
      const res = await getChapters(subjectId);
      setChapters(res.data?.chapters || []);
    } catch (error) {
      setChapters([]);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize
      };
      const res = await getQuestions(params);
      setQuestions(res.data?.questions || []);
      setPagination(prev => ({
        ...prev,
        total: res.data?.pagination?.total || 0,
        totalPages: res.data?.pagination?.totalPages || 1
      }));
    } catch (error) {
      message.error('获取题目列表失败');
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
    setSelectedSubject(null);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleAdd = () => {
    setEditingQuestion(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'single',
      score: 10,
      isPublic: false,
      options: [
        { key: 'A', content: '' },
        { key: 'B', content: '' },
        { key: 'C', content: '' },
        { key: 'D', content: '' }
      ]
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingQuestion(record);
    
    const formattedOptions = [];
    if (record.options && record.options.length > 0) {
      record.options.forEach((opt, index) => {
        formattedOptions[optionKeys.indexOf(opt.key)] = opt;
      });
      for (let i = 0; i < optionKeys.length; i++) {
        if (!formattedOptions[i]) {
          formattedOptions[i] = { key: optionKeys[i], content: '' };
        }
      }
    }
    
    form.setFieldsValue({
      ...record,
      options: formattedOptions,
      subject: record.subject?.id,
      chapter: record.chapter?.id,
      difficulty: record.difficulty?.id
    });
    setModalVisible(true);
  };

  const handleView = (record) => {
    setViewingQuestion(record);
    setViewModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteQuestion(id);
      if (res.success) {
        message.success('删除成功');
        fetchQuestions();
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = { ...values };
      
      if (submitData.options && Array.isArray(submitData.options)) {
        const validOptions = submitData.options
          .map((opt, index) => ({
            key: optionKeys[index],
            content: opt && typeof opt === 'object' ? opt.content : opt || ''
          }))
          .filter(opt => opt.content && opt.content.trim() !== '');
        
        submitData.options = validOptions;
      }
      
      let res;
      if (editingQuestion) {
        res = await updateQuestion(editingQuestion.id, submitData);
      } else {
        res = await createQuestion(submitData);
      }

      if (res.success) {
        message.success(editingQuestion ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchQuestions();
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error(editingQuestion ? '更新失败' : '创建失败');
    }
  };

  const handleSubjectChange = (value) => {
    setSelectedSubject(value);
    fetchChapters(value);
    form.setFieldsValue({ chapter: undefined });
  };

  const columns = [
    {
      title: '题目内容',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color="blue">{QUESTION_TYPE_MAP[type]}</Tag>
      )
    },
    {
      title: '学科',
      dataIndex: ['subject', 'name'],
      key: 'subject',
      width: 100
    },
    {
      title: '章节',
      dataIndex: ['chapter', 'name'],
      key: 'chapter',
      width: 100
    },
    {
      title: '难度',
      dataIndex: ['difficulty', 'name'],
      key: 'difficulty',
      width: 100
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 80
    },
    {
      title: '创建者',
      dataIndex: ['createdBy', 'username'],
      key: 'createdBy',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这道题吗？"
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

  const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h2>题库管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增题目
          </Button>
        </div>

        <Card className="card-shadow" style={{ marginBottom: 16 }}>
          <Form layout="inline" onFinish={handleSearch}>
            <Form.Item name="keyword" label="关键词">
              <Input placeholder="搜索题目内容" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="subject" label="学科">
              <Select placeholder="选择学科" style={{ width: 150 }} allowClear>
                {subjects.map(subject => (
                  <Option key={subject.id} value={subject.id}>
                    {subject.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="type" label="题型">
              <Select placeholder="选择题型" style={{ width: 120 }} allowClear>
                {QUESTION_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="difficulty" label="难度">
              <Select placeholder="选择难度" style={{ width: 120 }} allowClear>
                {difficulties.map(diff => (
                  <Option key={diff.id} value={diff.id}>
                    {diff.name}
                  </Option>
                ))}
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
            dataSource={questions}
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
          title={editingQuestion ? '编辑题目' : '新增题目'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={800}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            preserve={false}
          >
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="title"
                  label="题目内容"
                  rules={[{ required: true, message: '请输入题目内容' }]}
                >
                  <TextArea rows={3} placeholder="请输入题目内容" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="type"
                  label="题型"
                  rules={[{ required: true, message: '请选择题型' }]}
                >
                  <Select>
                    {QUESTION_TYPES.map(type => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
              {({ getFieldValue }) => {
                const type = getFieldValue('type');
                if (type === 'single' || type === 'multiple') {
                  return (
                    <div>
                      <Divider>选项</Divider>
                      {optionKeys.map((key, index) => (
                        <Form.Item
                          key={key}
                          name={['options', index, 'content']}
                          label={`选项 ${key}`}
                          rules={index < 2 ? [{ required: true, message: `选项 ${key} 不能为空` }] : []}
                        >
                          <Input placeholder={`请输入选项 ${key} 内容`} />
                        </Form.Item>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="correctAnswer"
                  label="正确答案"
                  rules={[{ required: true, message: '请输入正确答案' }]}
                >
                  <Input placeholder="如：A 或 ABCD" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="score" label="分值" initialValue={10}>
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="analysis" label="解析">
              <TextArea rows={2} placeholder="请输入题目解析" />
            </Form.Item>

            <Divider>分类信息</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="subject"
                  label="学科"
                  rules={[{ required: true, message: '请选择学科' }]}
                >
                  <Select placeholder="请选择学科" onChange={handleSubjectChange}>
                    {subjects.map(subject => (
                      <Option key={subject.id} value={subject.id}>
                        {subject.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="chapter" label="章节">
                  <Select placeholder="请选择章节" disabled={!selectedSubject}>
                    {chapters.map(chapter => (
                      <Option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="difficulty" label="难度">
                  <Select placeholder="请选择难度">
                    {difficulties.map(diff => (
                      <Option key={diff.id} value={diff.id}>
                        {diff.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="source" label="来源">
                  <Input placeholder="题目来源" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="isPublic" label="公开" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="tags" label="标签">
              <Input placeholder="用逗号分隔多个标签" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="题目详情"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={null}
          width={800}
        >
          {viewingQuestion && (
            <div>
              <div className="question-title">
                {viewingQuestion.title}
                <Tag style={{ marginLeft: 8 }}>{QUESTION_TYPE_MAP[viewingQuestion.type]}</Tag>
              </div>

              <div style={{ marginBottom: 16 }}>
                {viewingQuestion.subject?.name && <Tag color="blue">{viewingQuestion.subject.name}</Tag>}
                {viewingQuestion.chapter?.name && <Tag color="purple">{viewingQuestion.chapter.name}</Tag>}
                {viewingQuestion.difficulty?.name && <Tag color="orange">{viewingQuestion.difficulty.name}</Tag>}
                <Tag>分值：{viewingQuestion.score}</Tag>
              </div>

              {viewingQuestion.options && viewingQuestion.options.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4>选项：</h4>
                  {viewingQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`question-option ${viewingQuestion.correctAnswer?.includes(option.key) ? 'correct' : ''}`}
                    >
                      <strong>{option.key}.</strong> {option.content}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <h4>正确答案：</h4>
                <Tag color="green" style={{ fontSize: 16, padding: '4px 16px' }}>
                  {viewingQuestion.correctAnswer}
                </Tag>
              </div>

              {viewingQuestion.analysis && (
                <div>
                  <h4>解析：</h4>
                  <p>{viewingQuestion.analysis}</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
};

export default Questions;