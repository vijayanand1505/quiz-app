import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProgressChart from './index';
import { roundKey } from '../../utils/quizHistory';
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
const hard = {
  ...first,
  id: '3',
  difficulty: 'hard',
  correctAnswers: 5,
  testNumber: 3,
  completedAt: '2026-10-22T12:00:00.000Z',
};

test('inspects individual rounds and changes matching setups without mixing scores', () => {
  render(<ProgressChart rounds={[latest, hard, first]} />);
  expect(screen.getByText('+60 pts')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Friday practice · Test 2'
  );
  fireEvent.click(
    screen.getByRole('button', { name: /Mixed topics · Test 1, 20% correct/ })
  );
  expect(screen.getByRole('status')).toHaveTextContent('Mixed topics · Test 1');
  expect(screen.getByRole('status')).toHaveTextContent('1/5 correct');
  fireEvent.change(screen.getByLabelText('Compare matching rounds'), {
    target: { value: roundKey(hard) },
  });
  expect(
    screen.getByRole('group', { name: 'Round accuracy chart' })
  ).toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Mixed topics · Test 3');
  expect(
    screen.getByText(/Play one more round with these settings/)
  ).toBeInTheDocument();
});
test('keyboard focus exposes point details and name edits stay reflected in the chart', () => {
  const { rerender } = render(<ProgressChart rounds={[latest, first]} />);
  fireEvent.focus(
    screen.getByRole('button', { name: /Mixed topics · Test 1, 20% correct/ })
  );
  expect(screen.getByRole('status')).toHaveTextContent('Mixed topics · Test 1');
  rerender(
    <ProgressChart
      rounds={[latest, { ...first, customName: 'Earlier practice' }]}
    />
  );
  expect(screen.getByRole('status')).toHaveTextContent(
    'Earlier practice · Test 1'
  );
});
test('handles an empty record without producing a chart', () => {
  render(<ProgressChart rounds={[]} />);
  expect(
    screen.getByText('Finish a round to start your accuracy chart.')
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('group', { name: 'Round accuracy chart' })
  ).not.toBeInTheDocument();
});
