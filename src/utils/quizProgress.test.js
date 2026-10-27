import {
  groupProgressRounds,
  progressMetrics,
  progressSettingsLabel,
} from './quizProgress';
import { roundKey } from './quizHistory';
const first = {
  id: '1',
  topic: 'Mixed topics',
  categoryId: '0',
  difficulty: 'easy',
  format: '0',
  totalQuestions: 5,
  correctAnswers: 1,
  timeLimit: 120,
  testNumber: 1,
  completedAt: '2026-10-21T12:00:00.000Z',
};
const latest = {
  ...first,
  id: '2',
  correctAnswers: 4,
  testNumber: 2,
  customName: 'Friday practice',
  completedAt: '2026-10-23T12:00:00.000Z',
};

test('groups only identical settings and keeps custom names in the same comparison', () => {
  const differences = [
    { categoryId: '23', topic: 'History' },
    { difficulty: 'hard' },
    { format: 'boolean' },
    { totalQuestions: 10 },
    { timeLimit: 300 },
  ].map((settings, index) => ({
    ...first,
    ...settings,
    id: String(index + 3),
  }));
  const group = groupProgressRounds([latest, ...differences, first]);
  expect(group).toHaveLength(6);
  expect(group[0].key).toBe(roundKey(first));
  expect(group[0].rounds.map((item) => item.id)).toEqual(['1', '2']);
  expect(group[0].label).toBe(
    'Mixed topics · Easy · 5 questions · 2m · Mixed format · Exam'
  );
});
test('sorts matching rounds chronologically without mutating the saved history', () => {
  const rounds = [latest, first];
  expect(groupProgressRounds(rounds)[0].rounds).toEqual([first, latest]);
  expect(rounds).toEqual([latest, first]);
});
test('reports accuracy and percentage point changes, including sparse and empty history', () => {
  expect(progressMetrics([first, latest])).toEqual({
    latest: 80,
    average: 50,
    change: 60,
  });
  expect(progressMetrics([latest, first])).toEqual({
    latest: 20,
    average: 50,
    change: -60,
  });
  expect(progressMetrics([first])).toEqual({
    latest: 20,
    average: 20,
    change: null,
  });
  expect(progressMetrics([])).toEqual({ latest: 0, average: 0, change: null });
  expect(
    progressSettingsLabel({ ...first, timeLimit: 3661, totalQuestions: 1 })
  ).toContain('1 question · 1h 1m 1s');
});

test('labels untimed rounds clearly and compares them separately', () => {
  const untimed = { ...first, id: 'untimed', timeLimit: 0 };
  expect(groupProgressRounds([first, untimed])).toHaveLength(2);
  expect(progressSettingsLabel(untimed)).toContain('Untimed');
});
