import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ChallengeFriend from './index';
import { createChallengeLink } from '../../utils/friendChallenge';

jest.mock('../../utils/friendChallenge', () => ({
  ...jest.requireActual('../../utils/friendChallenge'),
  createChallengeLink: jest.fn(),
}));
const questions = [
  { question: 'Example?', options: ['A', 'B'], correct_answer: 'A' },
];
const round = { correctAnswers: 1, timeTaken: 5000, timeLimit: 120 };
const link = 'https://example.com/#challenge=1j.example';
const open = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Challenge a friend' }));
const create = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Create challenge link' })
  );
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
  createChallengeLink.mockReset().mockResolvedValue(link);
});

test('creates a named challenge, copies it, and invalidates the old link when the name changes', async () => {
  render(<ChallengeFriend questions={questions} round={round} />);
  open();
  expect(
    screen.getByRole('textbox', { name: 'Your name (optional)' })
  ).toHaveFocus();
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Your name (optional)' }),
    { target: { value: 'Vijay' } }
  );
  await act(async () => create());
  expect(createChallengeLink).toHaveBeenCalledWith(
    questions,
    round,
    'Vijay',
    'http://localhost/'
  );
  expect(screen.getByRole('textbox', { name: 'Challenge link' })).toHaveValue(
    link
  );
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Copy challenge link' }))
  );
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link);
  expect(screen.getByRole('status')).toHaveTextContent('Challenge link copied');
  expect(localStorage.getItem('quizapp.playerName')).toBe('Vijay');
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Your name (optional)' }),
    { target: { value: 'Anand' } }
  );
  expect(
    screen.queryByRole('textbox', { name: 'Challenge link' })
  ).not.toBeInTheDocument();
});

test('keeps a selectable link when clipboard access is unavailable', async () => {
  navigator.clipboard.writeText.mockRejectedValue(new Error('Denied'));
  render(<ChallengeFriend questions={questions} round={round} />);
  open();
  await act(async () => create());
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Copy challenge link' }))
  );
  expect(screen.getByRole('status')).toHaveTextContent('Select and copy');
  expect(
    screen.getByRole('textbox', { name: 'Challenge link' })
  ).toHaveAttribute('readonly');
});

test('handles generation failures and lets the user try again', async () => {
  createChallengeLink.mockRejectedValueOnce(
    new Error('This round is too large to share as a link.')
  );
  render(<ChallengeFriend questions={questions} round={round} />);
  open();
  await act(async () => create());
  expect(screen.getByRole('alert')).toHaveTextContent('too large');
  expect(
    screen.getByRole('button', { name: 'Create challenge link' })
  ).toBeEnabled();
  await act(async () => create());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Challenge link' })).toHaveValue(
    link
  );
});

test('ignores an unfinished generation after its dialog closes', async () => {
  let resolve;
  createChallengeLink.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  render(<ChallengeFriend questions={questions} round={round} />);
  open();
  create();
  expect(screen.getByRole('button', { name: 'Creating link…' })).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close challenge dialog' })
  );
  open();
  await act(async () => resolve(link));
  expect(
    screen.queryByRole('textbox', { name: 'Challenge link' })
  ).not.toBeInTheDocument();
});
