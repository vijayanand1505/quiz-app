export const validQuizMode = (mode) =>
  mode === undefined || mode === 'practice' || mode === 'exam';
export const quizModeLabel = (mode) =>
  mode === 'practice' ? 'Practice mode' : 'Exam mode';
