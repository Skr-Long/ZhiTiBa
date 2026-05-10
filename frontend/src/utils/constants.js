export const QUESTION_TYPES = [
  { value: 'single', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'fill', label: '填空题' },
  { value: 'judge', label: '判断题' },
  { value: 'essay', label: '简答题' },
  { value: 'other', label: '其他' }
];

export const QUESTION_TYPE_MAP = {
  single: '单选题',
  multiple: '多选题',
  fill: '填空题',
  judge: '判断题',
  essay: '简答题',
  other: '其他'
};

export const USER_ROLES = [
  { value: 'student', label: '学生' },
  { value: 'teacher', label: '教师' },
  { value: 'admin', label: '管理员' }
];

export const USER_ROLE_MAP = {
  student: '学生',
  teacher: '教师',
  admin: '管理员'
};

export const CATEGORY_TYPES = [
  { value: 'subject', label: '学科' },
  { value: 'chapter', label: '章节' },
  { value: 'difficulty', label: '难度' }
];

export const CATEGORY_TYPE_MAP = {
  subject: '学科',
  chapter: '章节',
  difficulty: '难度'
};

export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];