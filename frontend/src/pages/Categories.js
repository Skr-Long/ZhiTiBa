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
  InputNumber,
  Switch,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import AppLayout from '../components/Layout';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubjects,
  getChapters,
  getDifficulties
} from '../services/categoryService';
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_MAP
} from '../utils/constants';

const { Option } = Select;
const { TextArea } = Input;

const Categories = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('subject');
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = { type: activeTab };
      const res = await getCategories(params);
      setCategories(res.data?.categories || []);

      if (activeTab === 'chapter') {
        const subjectsRes = await getSubjects();
        setSubjects(subjectsRes.data?.subjects || []);
      }
    } catch (error) {
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      type: activeTab,
      isActive: true,
      sort: 0
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCategory(record);
    form.setFieldsValue({
      ...record,
      parent: record.parent?.id
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteCategory(id);
      if (res.success) {
        message.success('删除成功');
        fetchCategories();
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      let res;
      if (editingCategory) {
        res = await updateCategory(editingCategory.id, values);
      } else {
        res = await createCategory(values);
      }

      if (res.success) {
        message.success(editingCategory ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchCategories();
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error(editingCategory ? '更新失败' : '创建失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color="blue">{CATEGORY_TYPE_MAP[type]}</Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80
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
            title="确定要删除这个分类吗？"
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

  const chapterColumns = [
    ...columns,
    {
      title: '所属学科',
      dataIndex: ['parent', 'name'],
      key: 'parent',
      width: 120
    }
  ];

  const tabItems = [
    {
      key: 'subject',
      label: '学科管理',
      children: (
        <Card className="card-shadow">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={categories}
            loading={loading}
            pagination={false}
          />
        </Card>
      )
    },
    {
      key: 'chapter',
      label: '章节管理',
      children: (
        <Card className="card-shadow">
          <Table
            rowKey="id"
            columns={chapterColumns}
            dataSource={categories}
            loading={loading}
            pagination={false}
          />
        </Card>
      )
    },
    {
      key: 'difficulty',
      label: '难度管理',
      children: (
        <Card className="card-shadow">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={categories}
            loading={loading}
            pagination={false}
          />
        </Card>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h2>分类管理</h2>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCategories}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增{CATEGORY_TYPE_MAP[activeTab]}
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <Modal
          title={editingCategory ? '编辑分类' : '新增分类'}
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
            <Form.Item
              name="name"
              label="分类名称"
              rules={[{ required: true, message: '请输入分类名称' }]}
            >
              <Input placeholder="请输入分类名称" />
            </Form.Item>

            <Form.Item name="code" label="分类编码">
              <Input placeholder="请输入分类编码（可选）" />
            </Form.Item>

            <Form.Item
              name="type"
              label="分类类型"
              rules={[{ required: true, message: '请选择分类类型' }]}
            >
              <Select disabled={!!editingCategory}>
                {CATEGORY_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
              {({ getFieldValue }) => {
                const type = getFieldValue('type');
                if (type === 'chapter') {
                  return (
                    <Form.Item
                      name="parent"
                      label="所属学科"
                      rules={[{ required: true, message: '请选择所属学科' }]}
                    >
                      <Select placeholder="请选择所属学科">
                        {subjects.map(subject => (
                          <Option key={subject.id} value={subject.id}>
                            {subject.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Form.Item name="description" label="描述">
              <TextArea rows={2} placeholder="请输入描述" />
            </Form.Item>

            <Form.Item name="sort" label="排序" initialValue={0}>
              <InputNumber min={0} max={1000} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="isActive" label="状态" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default Categories;