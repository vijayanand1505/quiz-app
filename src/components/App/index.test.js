import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './index';
import { saveHistory } from '../../utils/quizHistory';

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
