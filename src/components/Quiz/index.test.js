import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Quiz from './index';

jest.mock('../Countdown', () => {
  const React = require('react');
  return function MockCountdown({ timeOver }) {
    return React.createElement(
      'button',
      { onClick: () => timeOver(30000) },
      'Expire timer'
    );
  };
});

const data = [
  {
    question: 'First question?',
    correct_answer: 'Alpha',
    options: ['Alpha', 'Beta'],
  },
  {
    question: 'Second question?',
    correct_answer: 'Gamma',
    options: ['Gamma', 'Delta'],
  },
  {
    question: 'Third question?',
    correct_answer: 'True',
    options: ['True', 'False'],
  },
];
const answer = (text) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${text}$`) }));
const next = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
const previous = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

beforeEach(() => {
  window.matchMedia = jest.fn(() => ({ matches: false }));
  Element.prototype.scrollIntoView = jest.fn();
});

test('restores and edits previous answers without counting a question twice', () => {
  const endQuiz = jest.fn();
  render(<Quiz data={data} countdownTime={120} endQuiz={endQuiz} />);
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  answer('Alpha');
  next();
  answer('Delta');
  next();
  previous();
  expect(screen.getByRole('button', { name: /Delta$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  answer('Gamma');
  previous();
  expect(screen.getByRole('button', { name: /Alpha$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  next();
  expect(screen.getByRole('button', { name: /Gamma$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  next();
  answer('True');
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  expect(endQuiz).toHaveBeenCalledTimes(1);
  expect(endQuiz).toHaveBeenCalledWith({
    totalQuestions: 3,
    correctAnswers: 3,
    timeTaken: 0,
    questionsAndAnswers: [
      {
        question: 'First question?',
        user_answer: 'Alpha',
        correct_answer: 'Alpha',
        point: 1,
      },
      {
        question: 'Second question?',
        user_answer: 'Gamma',
        correct_answer: 'Gamma',
        point: 1,
      },
      {
        question: 'Third question?',
        user_answer: 'True',
        correct_answer: 'True',
        point: 1,
      },
    ],
  });
});

test('timeout uses edited answers and retains answers from later questions', () => {
  const endQuiz = jest.fn();
  render(<Quiz data={data} countdownTime={120} endQuiz={endQuiz} />);
  answer('Alpha');
  next();
  answer('Gamma');
  previous();
  answer('Beta');
  fireEvent.click(screen.getByRole('button', { name: 'Expire timer' }));
  expect(endQuiz).toHaveBeenCalledWith({
    totalQuestions: 3,
    correctAnswers: 1,
    timeTaken: 30000,
    questionsAndAnswers: [
      {
        question: 'First question?',
        user_answer: 'Beta',
        correct_answer: 'Alpha',
        point: 0,
      },
      {
        question: 'Second question?',
        user_answer: 'Gamma',
        correct_answer: 'Gamma',
        point: 1,
      },
      {
        question: 'Third question?',
        user_answer: null,
        correct_answer: 'True',
        point: 0,
      },
    ],
  });
});

test('keeps desktop scroll position and focuses the new question for keyboard users', () => {
  render(<Quiz data={data} countdownTime={120} endQuiz={jest.fn()} />);
  answer('Alpha');
  next();
  expect(
    screen.getByRole('heading', { name: 'Second question?' })
  ).toHaveFocus();
  previous();
  expect(
    screen.getByRole('heading', { name: 'First question?' })
  ).toHaveFocus();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test.each([false, true])(
  'scrolls to the question card on small screens, reduced motion: %s',
  (reducedMotion) => {
    window.matchMedia.mockImplementation((query) => ({
      matches:
        query === '(max-width: 760px)' ||
        (reducedMotion && query === '(prefers-reduced-motion: reduce)'),
    }));
    const { container } = render(
      <Quiz data={data} countdownTime={120} endQuiz={jest.fn()} />
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    answer('Alpha');
    next();
    previous();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
      block: 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    expect(Element.prototype.scrollIntoView.mock.instances[0]).toBe(
      container.querySelector('.question-card')
    );
  }
);

test('keyboard shortcuts select, navigate, preserve edits, and submit the final question', () => {
  const endQuiz = jest.fn();
  render(<Quiz data={data} countdownTime={120} endQuiz={endQuiz} />);
  const key = (value) => fireEvent.keyDown(document.body, { key: value });
  key('ArrowRight');
  expect(
    screen.getByRole('heading', { name: 'First question?' })
  ).toBeInTheDocument();
  key('1');
  key('ArrowRight');
  key('2');
  key('ArrowLeft');
  key('2');
  key('Enter');
  expect(screen.getByRole('button', { name: /Delta$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  key('ArrowRight');
  key('4');
  expect(screen.getByRole('button', { name: 'Finish round' })).toBeDisabled();
  key('1');
  key('Enter');
  expect(endQuiz).toHaveBeenCalledTimes(1);
  expect(endQuiz.mock.calls[0][0].correctAnswers).toBe(1);
  expect(
    endQuiz.mock.calls[0][0].questionsAndAnswers.map((item) => item.user_answer)
  ).toEqual(['Beta', 'Delta', 'True']);
});

test('shortcuts leave typing, modified keys, and native button Enter actions alone', () => {
  render(
    <>
      <input aria-label="Test input" />
      <Quiz data={data} countdownTime={120} endQuiz={jest.fn()} />
    </>
  );
  fireEvent.keyDown(screen.getByLabelText('Test input'), { key: '1' });
  fireEvent.keyDown(document.body, { key: '1', ctrlKey: true });
  fireEvent.keyDown(document.body, { key: '1', repeat: true });
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  answer('Alpha');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Previous' }), {
    key: 'Enter',
  });
  expect(
    screen.getByRole('heading', { name: 'First question?' })
  ).toBeInTheDocument();
});

test('navigator preserves answers and guides skipped questions before submission', () => {
  const endQuiz = jest.fn();
  render(<Quiz data={data} countdownTime={120} endQuiz={endQuiz} />);
  expect(
    screen.getByRole('button', { name: 'Question 1, unanswered' })
  ).toHaveAttribute('aria-current', 'step');
  answer('Alpha');
  expect(
    screen.getByRole('button', { name: 'Question 1, answered' })
  ).toHaveAttribute('aria-current', 'step');
  fireEvent.click(
    screen.getByRole('button', { name: 'Question 3, unanswered' })
  );
  expect(
    screen.getByRole('heading', { name: 'Third question?' })
  ).toHaveFocus();
  expect(
    screen.getByRole('progressbar', { name: 'Quiz progress' })
  ).toHaveAttribute('aria-valuenow', '1');
  answer('True');
  fireEvent.click(screen.getByRole('button', { name: 'Review unanswered' }));
  expect(endQuiz).not.toHaveBeenCalled();
  expect(
    screen.getByRole('heading', { name: 'Second question?' })
  ).toBeInTheDocument();
  answer('Gamma');
  next();
  expect(screen.getByRole('button', { name: /True$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  fireEvent.click(screen.getByRole('button', { name: 'Finish round' }));
  expect(endQuiz).toHaveBeenCalledTimes(1);
  expect(endQuiz.mock.calls[0][0].correctAnswers).toBe(3);
  expect(endQuiz.mock.calls[0][0].questionsAndAnswers).toHaveLength(3);
});

test('next unanswered wraps around and jumping does not mark an empty question answered', () => {
  render(<Quiz data={data} countdownTime={120} endQuiz={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next unanswered' }));
  expect(
    screen.getByRole('button', { name: 'Question 2, unanswered' })
  ).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  answer('Gamma');
  fireEvent.click(
    screen.getByRole('button', { name: 'Question 3, unanswered' })
  );
  answer('True');
  fireEvent.click(screen.getByRole('button', { name: 'Next unanswered' }));
  expect(
    screen.getByRole('button', { name: 'Question 1, unanswered' })
  ).toHaveAttribute('aria-current', 'step');
  answer('Alpha');
  expect(
    screen.getByRole('button', { name: 'Next unanswered' })
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Question 2, answered' }));
  expect(screen.getByRole('button', { name: /Gamma$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('viewing another area disables answer shortcuts without losing the current answer', () => {
  const endQuiz = jest.fn();
  const { rerender } = render(
    <Quiz data={data} countdownTime={120} endQuiz={endQuiz} />
  );
  answer('Alpha');
  rerender(
    <Quiz data={data} countdownTime={120} endQuiz={endQuiz} isActive={false} />
  );
  fireEvent.keyDown(document.body, { key: '2' });
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(screen.getByRole('button', { name: /Alpha$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(
    screen.getByRole('heading', { name: 'First question?' })
  ).toBeInTheDocument();
  rerender(<Quiz data={data} countdownTime={120} endQuiz={endQuiz} isActive />);
  fireEvent.keyDown(document.body, { key: '2' });
  expect(screen.getByRole('button', { name: /Beta$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('can turn shortcuts off while preserving native keyboard activation and saving the preference', () => {
  localStorage.removeItem('quizapp.shortcuts');
  render(<Quiz data={data} countdownTime={0} endQuiz={jest.fn()} />);
  fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));
  fireEvent.keyDown(document.body, { key: '1' });
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(localStorage.getItem('quizapp.shortcuts')).toBe('off');
  answer('Alpha');
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(
    screen.getByRole('heading', { name: 'First question?' })
  ).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(
    screen.getByRole('heading', { name: 'Second question?' })
  ).toBeInTheDocument();
  localStorage.removeItem('quizapp.shortcuts');
});

test('practice reveals feedback once and locks first answers for both buttons and shortcuts', () => {
  localStorage.removeItem('quizapp.shortcuts');
  const endQuiz = jest.fn();
  render(
    <Quiz data={data} countdownTime={0} endQuiz={endQuiz} mode="practice" />
  );
  expect(screen.queryByText('Correct answer: Alpha')).not.toBeInTheDocument();
  answer('Beta');
  expect(screen.getByText('Not quite.')).toBeVisible();
  expect(screen.getByText('Correct answer: Alpha')).toBeVisible();
  expect(screen.getByRole('button', { name: /Alpha$/ })).toBeDisabled();
  fireEvent.keyDown(document.body, { key: '1' });
  expect(screen.getByRole('button', { name: /Beta$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  next();
  answer('Gamma');
  previous();
  expect(screen.getByText('Correct answer: Alpha')).toBeVisible();
  expect(screen.getByRole('button', { name: /Beta$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expire timer' }));
  expect(endQuiz.mock.calls[0][0].correctAnswers).toBe(1);
});

test('exam keeps feedback hidden and answers editable', () => {
  render(
    <Quiz data={data} countdownTime={0} endQuiz={jest.fn()} mode="exam" />
  );
  answer('Beta');
  answer('Alpha');
  expect(screen.queryByText('Correct answer: Alpha')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Alpha$/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Alpha$/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});
