import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './index';
import { saveHistory } from '../../utils/quizHistory';
import { ATTEMPTS_KEY } from '../../utils/quizAttempts';
import {
  newQuizDraft,
  newQuestion,
  saveQuizDrafts,
} from '../../utils/customQuiz';

jest.mock('../Main', () => {
  const React = require('react');
  return function MockMain({ startQuiz }) {
    const [subject, setSubject] = React.useState('');
    return React.createElement(
      'div',
      null,
      React.createElement('h1', null, 'Quiz setup'),
      React.createElement('input', {
        'aria-label': 'Subject selection',
        value: subject,
        onChange: (event) => setSubject(event.target.value),
      }),
      React.createElement(
        'button',
        {
          onClick: () =>
            startQuiz(
              [
                {
                  question: 'Sample question?',
                  correct_answer: 'Alpha',
                  options: ['Alpha', 'Beta'],
                },
              ],
              120,
              {
                topic: 'Mixed topics',
                categoryId: '0',
                difficulty: 'easy',
                format: '0',
              }
            ),
        },
        'Start sample quiz'
      )
    );
  };
});
jest.mock('../Countdown', () => {
  const React = require('react');
  return function MockCountdown() {
    return React.createElement('span', null, 'Timer running');
  };
});
const navigate = (hash) =>
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  window.matchMedia = jest.fn(() => ({ matches: false }));
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('keeps setup separate from record views and preserves setup fields when returning', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Quiz setup' })).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Progress over time' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Your next round starts a record.' })
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Subject selection'), {
    target: { value: 'Science' },
  });
  navigate('#record');
  expect(screen.getByRole('heading', { name: 'My record' })).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Quiz setup' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Progress over time' })
  ).not.toBeInTheDocument();
  navigate('#record/progress');
  expect(
    screen.getByRole('heading', { name: 'Progress over time' })
  ).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Your next round starts a record.' })
  ).not.toBeInTheDocument();
  navigate('#record/bests');
  expect(
    screen.getByRole('heading', { name: 'No personal bests yet.' })
  ).toBeVisible();
  navigate('#quiz');
  expect(screen.getByRole('heading', { name: 'Quiz setup' })).toBeVisible();
  expect(screen.getByLabelText('Subject selection')).toHaveValue('Science');
});

test('opens the progress area directly from its URL with saved history', () => {
  const round = {
    id: 'saved',
    topic: 'Mixed topics',
    categoryId: '0',
    difficulty: 'easy',
    format: '0',
    testNumber: 7,
    totalQuestions: 5,
    correctAnswers: 4,
    timeTaken: 10000,
    timeLimit: 120,
    completedAt: '2026-10-23T12:00:00.000Z',
  };
  saveHistory([round], [round], 7);
  window.history.replaceState(null, '', '#record/progress');
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Progress over time' })
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: /Mixed topics · Test 7, 80% correct/ })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Quiz setup' })
  ).not.toBeInTheDocument();
  const navigation = screen.getByRole('navigation', {
    name: 'Main navigation',
  });
  expect(
    within(navigation).getByRole('link', { name: 'My record' })
  ).toHaveAttribute('aria-current', 'page');
});

test('retains an active quiz across area changes and shows its saved result in the record area', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start sample quiz' }));
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: /Alpha$/ }));
  navigate('#record');
  expect(screen.getByText(/Your quiz is still running/)).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Sample question?' })
  ).not.toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: '2' });
  navigate('#quiz');
  expect(screen.getByRole('button', { name: /Alpha$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  expect(screen.getByRole('heading', { name: 'A clean sweep.' })).toBeVisible();
  navigate('#record');
  expect(
    screen.getByRole('heading', { name: 'Mixed topics · Test 1' })
  ).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Progress over time' })
  ).not.toBeInTheDocument();
  navigate('#record/progress');
  expect(
    screen.getByRole('button', { name: /Mixed topics · Test 1, 100% correct/ })
  ).toBeInTheDocument();
  navigate('#quiz');
  expect(screen.getByRole('heading', { name: 'A clean sweep.' })).toBeVisible();
});

const invitePayload = {
  v: 1,
  host: 'Vijay',
  title: 'Friday challenge',
  settings: ['0', 'easy', '0', 120, 'Mixed topics'],
  score: [0, 10000],
  questions: [
    ['Challenge question?', ['Alpha', 'Beta'], 0, 'Mixed topics', 'easy'],
  ],
};
const inviteHash = (payload = invitePayload) =>
  `#challenge=1j.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;

test('accepts an incoming challenge without API calls and compares its saved result', async () => {
  global.fetch = jest.fn();
  window.history.replaceState(null, '', inviteHash());
  render(<App />);
  await act(async () => {});
  expect(
    screen.getByRole('heading', { name: 'Vijay challenged you.' })
  ).toBeVisible();
  expect(screen.getByText('Friday challenge')).toBeVisible();
  expect(screen.queryByText('Challenge question?')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Accept challenge' }));
  navigate('#quiz');
  act(() => jest.advanceTimersByTime(1000));
  expect(
    screen.getByRole('heading', { name: 'Challenge question?' })
  ).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  expect(
    screen.getByRole('heading', { name: 'You won the challenge.' })
  ).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
  const stored = JSON.parse(localStorage.getItem('quizapp.rounds.v1'));
  expect(stored.rounds[0]).toMatchObject({
    correctAnswers: 1,
    timeLimit: 120,
    challengeHost: 'Vijay',
    customName: 'Friday challenge',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  act(() => jest.advanceTimersByTime(1000));
  expect(
    screen.getByRole('heading', { name: 'Challenge question?' })
  ).toBeVisible();
  expect(
    screen
      .getAllByRole('button')
      .filter((button) => button.classList.contains('answer-option'))
      .map((button) => button.textContent)
  ).toEqual(['AAlpha', 'BBeta']);
});

test('shows a recoverable invalid-link page and can return to quiz setup', async () => {
  window.history.replaceState(null, '', '#challenge=broken');
  render(<App />);
  await act(async () => {});
  expect(
    screen.getByRole('heading', { name: 'Can’t open this challenge.' })
  ).toHaveFocus();
  expect(
    screen.queryByRole('button', { name: 'Accept challenge' })
  ).not.toBeInTheDocument();
  navigate('#quiz');
  expect(screen.getByRole('heading', { name: 'Quiz setup' })).toBeVisible();
});

test('does not replace a running quiz when a new challenge link is opened', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start sample quiz' }));
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
  navigate(inviteHash());
  await act(async () => {});
  expect(
    screen.getByText(/Finish it before starting this challenge/)
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Accept challenge' })
  ).not.toBeInTheDocument();
  navigate('#quiz');
  expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('keeps the builder separate, plays a saved custom quiz, and retains its editor across navigation', () => {
  const draft = {
    ...newQuizDraft(),
    title: 'Class quiz',
    questions: [
      {
        ...newQuestion(),
        prompt: 'A custom question?',
        options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
        correctIndex: 1,
      },
    ],
  };
  saveQuizDrafts({ drafts: [draft], selectedId: draft.id });
  render(<App />);
  navigate('#builder');
  expect(
    screen.getByRole('heading', { name: 'Make it your quiz.' })
  ).toBeVisible();
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Class quiz');
  fireEvent.click(screen.getByRole('button', { name: 'Play quiz' }));
  navigate('#quiz');
  act(() => jest.advanceTimersByTime(1000));
  expect(
    screen.getByRole('heading', { name: 'A custom question?' })
  ).toBeVisible();
  navigate('#builder');
  expect(screen.getByRole('button', { name: 'Play quiz' })).toBeDisabled();
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Class quiz');
  navigate('#quiz');
  fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  expect(
    JSON.parse(localStorage.getItem('quizapp.rounds.v1')).rounds[0]
  ).toMatchObject({
    topic: 'Class quiz',
    difficulty: 'custom',
    customQuizKey: `${draft.id}.1`,
    correctAnswers: 1,
  });
  navigate('#builder');
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Class quiz');
  expect(screen.getByRole('button', { name: 'Play quiz' })).toBeEnabled();
});

const customHash = (payload) =>
  `#custom=1j.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
test('opens a shared custom quiz independently and scores it without using the trivia API', async () => {
  global.fetch = jest.fn();
  const payload = {
    v: 1,
    id: 'shared-quiz',
    revision: 2,
    title: 'Family quiz',
    author: 'Vijay',
    description: 'A quick round for everyone.',
    timeLimit: 0,
    questions: [['A shared question?', 'boolean', ['True', 'False'], 0]],
  };
  window.history.replaceState(null, '', customHash(payload));
  render(<App />);
  await act(async () => {});
  expect(screen.getByRole('heading', { name: 'Family quiz' })).toBeVisible();
  expect(screen.getByText('A quiz by Vijay')).toBeVisible();
  expect(screen.queryByText('A shared question?')).not.toBeInTheDocument();
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Start this quiz' }))
  );
  navigate('#quiz');
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: 'True' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  expect(screen.getByRole('heading', { name: 'A clean sweep.' })).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'You won the challenge.' })
  ).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test('handles malformed custom links without replacing a running quiz', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start sample quiz' }));
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
  navigate('#custom=broken');
  await act(async () => {});
  expect(
    screen.getByRole('heading', { name: 'Can’t open this quiz.' })
  ).toHaveFocus();
  expect(
    screen.getByRole('link', { name: 'Return to your quiz' })
  ).toHaveAttribute('href', '#quiz');
  navigate('#quiz');
  expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('counts shared quiz starts and replays, then keeps the exhausted limit after reopening', async () => {
  const hash = customHash({
    v: 1,
    id: 'limited',
    revision: 1,
    title: 'Two tries',
    author: '',
    description: '',
    timeLimit: 0,
    maxAttempts: 2,
    questions: [['A limited question?', 'boolean', ['True', 'False'], 0]],
  });
  window.history.replaceState(null, '', hash);
  const { unmount } = render(<App />);
  await act(async () => {});
  expect(
    screen.getByText('2 attempts remaining on this browser.')
  ).toBeVisible();
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Start this quiz' }))
  );
  navigate('#quiz');
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText('Attempt 1 of 2')).toBeVisible();
  const finish = () => {
    fireEvent.click(screen.getByRole('button', { name: 'True' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
    act(() => jest.advanceTimersByTime(2000));
  };
  finish();
  expect(screen.getByRole('button', { name: 'Play again' })).toBeEnabled();
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
  );
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText('Attempt 2 of 2')).toBeVisible();
  finish();
  expect(screen.getByRole('button', { name: 'Play again' })).toBeDisabled();
  expect(
    JSON.parse(localStorage.getItem('quizapp.rounds.v1')).rounds[0]
  ).toMatchObject({ attemptNumber: 2, maxAttempts: 2 });
  unmount();
  // Clearing results cannot restore consumed attempts.
  saveHistory([], [], 0);
  window.history.replaceState(null, '', hash);
  render(<App />);
  await act(async () => {});
  expect(
    screen.getByText('No attempts remaining on this browser.')
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Start this quiz' })
  ).toBeDisabled();
  expect(
    JSON.parse(localStorage.getItem(ATTEMPTS_KEY)).counts['limited.1']
  ).toBe(2);
}, 30000);

test('creator previews can replay an exhausted custom quiz without consuming attempts', () => {
  const draft = {
    ...newQuizDraft(),
    title: 'Preview',
    maxAttempts: 1,
    questions: [
      {
        ...newQuestion(),
        prompt: 'Preview question?',
        type: 'boolean',
        options: ['True', 'False'],
        correctIndex: 0,
      },
    ],
  };
  saveQuizDrafts({ drafts: [draft], selectedId: draft.id });
  localStorage.setItem(
    ATTEMPTS_KEY,
    JSON.stringify({ v: 1, counts: { [`${draft.id}.1`]: 1 } })
  );
  window.history.replaceState(null, '', '#builder');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Play quiz' }));
  navigate('#quiz');
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText('Creator preview · No attempts used.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'True' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  expect(screen.getByRole('button', { name: 'Play again' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  act(() => jest.advanceTimersByTime(1000));
  expect(
    screen.getByRole('heading', { name: 'Preview question?' })
  ).toBeVisible();
  expect(
    JSON.parse(localStorage.getItem(ATTEMPTS_KEY)).counts[`${draft.id}.1`]
  ).toBe(1);
});

test('saves a question from a round, preserves it across areas, and starts isolated bookmark practice', async () => {
  const { unmount } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start sample quiz' }));
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
  expect(
    screen.getByRole('button', { name: 'Question saved' })
  ).toHaveAttribute('aria-pressed', 'true');
  navigate('#bookmarks');
  expect(
    screen.getByRole('heading', { name: 'Saved questions' })
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Practice selected (1)' })
  ).toBeDisabled();
  navigate('#quiz');
  fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  fireEvent.click(screen.getByRole('tab', { name: 'Review answers' }));
  expect(screen.getByRole('button', { name: 'Question saved' })).toBeVisible();
  // Returning after a browser reload keeps the library independent of results.
  unmount();
  window.history.replaceState(null, '', '#bookmarks');
  render(<App />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Practice selected (1)' })
  );
  navigate('#quiz');
  act(() => jest.advanceTimersByTime(1000));
  expect(
    screen.getByRole('heading', { name: 'Sample question?' })
  ).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
  expect(screen.getByText('Correct answer: Alpha')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  act(() => jest.advanceTimersByTime(2000));
  expect(
    JSON.parse(localStorage.getItem('quizapp.rounds.v1')).rounds[0]
  ).toMatchObject({
    mode: 'practice',
    fromBookmarks: true,
    timeLimit: 0,
    correctAnswers: 0,
  });
  expect(localStorage.getItem(ATTEMPTS_KEY)).toBeNull();
}, 30000);

test('opens collections directly and restores collection membership when returning to the builder', () => {
  const draft = {
    ...newQuizDraft(),
    title: 'Science quiz',
    collectionId: 'science',
  };
  saveQuizDrafts({
    drafts: [draft],
    selectedId: draft.id,
    collections: [{ id: 'science', name: 'Science' }],
  });
  window.history.replaceState(null, '', '#builder/collections');
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Quiz collections' })
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: /Science quiz.*Edit quiz/ })
  );
  navigate('#builder');
  expect(screen.getByLabelText('Quiz title')).toHaveValue('Science quiz');
  expect(screen.getByLabelText('Collection')).toHaveValue('science');
  navigate('#bookmarks');
  navigate('#builder/collections');
  expect(screen.getByRole('heading', { name: 'Science' })).toBeVisible();
});
