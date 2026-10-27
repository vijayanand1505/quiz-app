import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import QuizBuilder from './index';
import { DRAFTS_KEY, openCustomQuiz } from '../../utils/customQuiz';
beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const fill = () => {
  fireEvent.change(screen.getByLabelText('Quiz title'), {
    target: { value: 'Friday quiz' },
  });
  const question = screen.getByRole('region', { name: 'Question 1' });
  fireEvent.change(within(question).getByLabelText('Question text'), {
    target: { value: 'First question?' },
  });
  ['Alpha', 'Beta', 'Gamma', 'Delta'].forEach((answer, index) =>
    fireEvent.change(
      within(question).getByLabelText(
        `Answer ${String.fromCharCode(65 + index)}`,
        { exact: true }
      ),
      { target: { value: answer } }
    )
  );
  fireEvent.click(within(question).getByLabelText('Mark answer B as correct'));
};

test('validates required fields, saves incomplete edits and restores them after remount', () => {
  const { unmount } = render(<QuizBuilder onPlay={jest.fn()} isActive />);
  fireEvent.click(screen.getByRole('button', { name: 'Play quiz' }));
  act(() => jest.advanceTimersByTime(0));
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('Quiz title')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
  fireEvent.change(screen.getByLabelText('Quiz title'), {
    target: { value: 'An unfinished quiz' },
  });
  unmount();
  expect(JSON.parse(localStorage.getItem(DRAFTS_KEY)).drafts[0].title).toBe(
    'An unfinished quiz'
  );
  render(<QuizBuilder onPlay={jest.fn()} isActive />);
  expect(screen.getByLabelText('Quiz title')).toHaveValue('An unfinished quiz');
});

test('adds, reorders, removes and restores questions without changing their correct answers', () => {
  const onPlay = jest.fn();
  render(<QuizBuilder onPlay={onPlay} isActive />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: /Add question/ }));
  const second = screen.getByRole('region', { name: 'Question 2' });
  fireEvent.change(within(second).getByLabelText('Answer format'), {
    target: { value: 'boolean' },
  });
  fireEvent.change(within(second).getByLabelText('Question text'), {
    target: { value: 'True or false?' },
  });
  fireEvent.click(within(second).getByLabelText('Mark answer A as correct'));
  fireEvent.click(
    within(second).getByRole('button', { name: 'Move question 2 up' })
  );
  expect(
    within(screen.getByRole('region', { name: 'Question 1' })).getByLabelText(
      'Question text'
    )
  ).toHaveValue('True or false?');
  fireEvent.click(screen.getByRole('button', { name: 'Remove question 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play quiz' }));
  const quiz = onPlay.mock.calls[0][0];
  expect(quiz.questions.map((question) => question.correct_answer)).toEqual([
    'True',
    'Beta',
  ]);
  expect(quiz.settings.format).toBe('0');
});

test('manages separate saved drafts and confirms deletion of a quiz', () => {
  render(<QuizBuilder onPlay={jest.fn()} isActive />);
  fill();
  const first = screen.getByLabelText('Your quizzes').value;
  fireEvent.click(screen.getByRole('button', { name: 'New quiz' }));
  fireEvent.change(screen.getByLabelText('Quiz title'), {
    target: { value: 'Second quiz' },
  });
  fireEvent.change(screen.getByLabelText('Your quizzes'), {
    target: { value: first },
  });
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Friday quiz');
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  expect(screen.getByText('Delete this quiz draft?')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Keep quiz' }));
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Friday quiz');
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Delete quiz', exact: true })
  );
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Second quiz');
});

test('keeps draft editing usable when storage is unavailable and an active quiz blocks play', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  render(<QuizBuilder onPlay={jest.fn()} isActive quizActive />);
  fill();
  act(() => jest.advanceTimersByTime(350));
  expect(screen.getByText(/Browser storage is unavailable/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Play quiz' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Create quiz link' })
  ).toBeEnabled();
});

test('shares a playable snapshot, handles clipboard failure, and invalidates links after edits', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockRejectedValue(new Error('Denied')) },
  });
  render(<QuizBuilder onPlay={jest.fn()} isActive />);
  fill();
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Create quiz link' }))
  );
  const oldLink = screen.getByRole('textbox', { name: 'Quiz link' }).value;
  expect(oldLink).toContain('#custom=1j.');
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Copy quiz link' }))
  );
  expect(
    screen.getByText('Select and copy the quiz link below.')
  ).toBeVisible();
  fireEvent.change(
    within(screen.getByRole('region', { name: 'Question 1' })).getByLabelText(
      'Question text'
    ),
    { target: { value: 'A revised question?' } }
  );
  expect(
    screen.queryByRole('textbox', { name: 'Quiz link' })
  ).not.toBeInTheDocument();
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Create quiz link' }))
  );
  expect(screen.getByRole('textbox', { name: 'Quiz link' }).value).not.toBe(
    oldLink
  );
});

test('sets an optional time limit without changing the questions', () => {
  const onPlay = jest.fn();
  render(<QuizBuilder onPlay={onPlay} isActive />);
  fill();
  fireEvent.click(screen.getByLabelText('No time limit'));
  fireEvent.change(screen.getByLabelText('Time limit in minutes'), {
    target: { value: '120' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Play quiz' }));
  expect(onPlay.mock.calls[0][0].timeLimit).toBe(120);
  expect(onPlay.mock.calls[0][0].questions[0].correct_answer).toBe('Beta');
});

test('saves the allowed attempts, shares the policy, and keeps creator play a preview', async () => {
  const onPlay = jest.fn();
  const { unmount } = render(<QuizBuilder onPlay={onPlay} isActive />);
  fill();
  fireEvent.change(screen.getByLabelText('Allowed attempts'), {
    target: { value: '2' },
  });
  act(() => jest.advanceTimersByTime(350));
  const stored = JSON.parse(localStorage.getItem(DRAFTS_KEY)).drafts[0];
  expect(stored.maxAttempts).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'Play quiz' }));
  expect(onPlay.mock.calls[0][0].settings).toMatchObject({
    maxAttempts: 2,
    isCustomPreview: true,
  });
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Create quiz link' }))
  );
  const shared = await openCustomQuiz(
    new URL(screen.getByLabelText('Quiz link').value).hash.slice(8)
  );
  expect(shared.settings.maxAttempts).toBe(2);
  expect(shared.settings.isCustomPreview).toBeUndefined();
  fireEvent.change(screen.getByLabelText('Allowed attempts'), {
    target: { value: '1' },
  });
  expect(screen.queryByLabelText('Quiz link')).not.toBeInTheDocument();
  unmount();
  render(<QuizBuilder onPlay={onPlay} isActive />);
  expect(screen.getByLabelText('Allowed attempts')).toHaveValue('1');
  expect(JSON.parse(localStorage.getItem(DRAFTS_KEY)).drafts[0].revision).toBe(
    stored.revision
  );
});
