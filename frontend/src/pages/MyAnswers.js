import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Space,
  Modal,
  Descriptions,
  Progress,
  Statistic,
  Row,
  Col,
  Tabs
} from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import AppLayout from '../components/Layout';
import { getMyRecords, getMyStats, getAnswerRecord } from '../services/answerService';

const { TabPane } = Tabs;

const MyAnswers = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRecords = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await getMyRecords({ page, pageSize });
      if (response.success) {
        setRecords(response.data.records);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('获取答题记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getMyStats();
      if (response.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, []);

  const handleViewDetail = async (record) => {
    setDetailLoading(true);
    try {
      const response = await getAnswerRecord(record._id);
      if (response.success) {
        setCurrentRecord({
          ...record,
          detail: response.data
        });
        setDetailVisible(true);
      }
    } catch (error) {
      console.error('获取详情失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getScoreColor = (score, maxScore) => {
    if (!maxScore) return 'blue';
    const ratio = score / maxScore;
    if (ratio >= 0.9) return 'green';
    if (ratio >= 0.6) return 'blue';
    if (ratio >= 0.4) return 'orange';
    return 'red';
  };

  const getGradeStatus = (status) => {
    const statusMap = {
      auto: { text: '自动批改', color: 'green' },
      manual: { text: '已批改', color: 'blue' },
      partial: { text: '待人工批改', color: 'orange' },
      none: { text: '未批改', color: 'default' }
    };
    const info = statusMap[status] || statusMap.none;
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const columns = [
    {
      title: '试卷名称',
      dataIndex: ['exam', 'title'],
      key: 'examTitle',
      render: (text) => text || '-'
    },
    {
      title: '得分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      render: (score, record) => (
        <Space>
          <span style={{ fontWeight: 'bold', color: getScoreColor(score, record.maxScore) }}>
            {score}
          </span>
          <span>/</span>
          <span>{record.maxScore}</span>
        </Space>
      )
    },
    {
      title: '正确率',
      dataIndex: 'accuracyRate',
      key: 'accuracyRate',
      render: (rate) => (
        <Progress percent={rate ? Math.round(rate) : 0} size="small" />
      )
    },
    {
      title: '答题情况',
      key: 'stats',
      render: (_, record) => (
        <Space>
          <Tag icon={<CheckCircleOutlined />} color="success">{record.correctCount}正确</Tag>
          <Tag icon={<CloseCircleOutlined />} color="error">{record.wrongCount}错误</Tag>
          <Tag icon={<ClockCircleOutlined />} color="warning">{record.unansweredCount}未答</Tag>
        </Space>
      )
    },
    {
      title: '批改状态',
      dataIndex: 'gradingStatus',
      key: 'gradingStatus',
      render: (status) => getGradeStatus(status)
    },
    {
      title: '耗时',
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      render: (seconds) => {
        if (!seconds) return '-';
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}分${secs}秒`;
      }
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      key: 'submitTime',
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>
      )
    }
  ];

  return (
    <AppLayout>
      <Card>
        {stats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic title="答题总数" value={stats.totalExams || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="平均正确率" value={`${Math.round(stats.avgAccuracy || 0)}%`} />
            </Col>
            <Col span={6}>
              <Statistic title="平均用时" value={`${Math.round((stats.avgTimeSpent || 0) / 60)}分钟`} />
            </Col>
            <Col span={6}>
              <Statistic title="最高得分" value={stats.maxScore || 0} />
            </Col>
          </Row>
        )}

        <Tabs defaultActiveKey="1">
          <TabPane tab="我的答卷" key="1">
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={records}
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="答卷详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
        loading={detailLoading}
      >
        {currentRecord && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="试卷名称">
                {currentRecord.exam?.title || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="得分">
                <span style={{ 
                  fontWeight: 'bold',
                  color: getScoreColor(currentRecord.totalScore, currentRecord.maxScore)
                }}>
                  {currentRecord.totalScore} / {currentRecord.maxScore}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="正确率">
                {currentRecord.accuracyRate ? Math.round(currentRecord.accuracyRate) : 0}%
              </Descriptions.Item>
              <Descriptions.Item label="批改状态">
                {getGradeStatus(currentRecord.gradingStatus)}
              </Descriptions.Item>
              <Descriptions.Item label="答对">
                <Tag color="green">{currentRecord.correctCount}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="答错">
                <Tag color="red">{currentRecord.wrongCount}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="未答">
                <Tag color="orange">{currentRecord.unansweredCount}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="用时">
                {currentRecord.timeSpent 
                  ? `${Math.floor(currentRecord.timeSpent / 60)}分${currentRecord.timeSpent % 60}秒`
                  : '-'
                }
              </Descriptions.Item>
            </Descriptions>

            {currentRecord.detail?.answers && (
              <Card title="答题详情" style={{ marginTop: 16 }}>
                {currentRecord.detail.answers.map((answer, index) => (
                  <Card
                    key={index}
                    type="inner"
                    title={`第${index + 1}题`}
                    size="small"
                    style={{ marginBottom: 12 }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <strong>您的答案：</strong>
                        <span style={{ 
                          color: answer.isCorrect ? '#52c41a' : '#ff4d4f',
                          marginLeft: 8
                        }}>
                          {answer.userAnswer || '(未作答)'}
                        </span>
                        {answer.isCorrect ? (
                          <Tag color="green" style={{ marginLeft: 8 }}>正确</Tag>
                        ) : (
                          <Tag color="red" style={{ marginLeft: 8 }}>错误</Tag>
                        )}
                      </div>
                      {!answer.isCorrect && answer.correctAnswer && (
                        <div>
                          <strong>正确答案：</strong>
                          <span style={{ color: '#52c41a', marginLeft: 8 }}>
                            {answer.correctAnswer}
                          </span>
                        </div>
                      )}
                      <div>
                        <strong>得分：</strong>
                        <span style={{ marginLeft: 8 }}>
                          {answer.score} / {answer.maxScore}
                        </span>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Card>
            )}
          </>
        )}
      </Modal>
    </AppLayout>
  );
};

export default MyAnswers;