import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Result from './index';

const props = {
  totalQuestions: 1,
  correctAnswers: 1,
  timeTaken: 5000,
  questionsAndAnswers: [
    {
      question: 'Example?',
      user_answer: 'Alpha',
      correct_answer: 'Alpha',
      point: 1,
    },
  ],
  replayQuiz: jest.fn(),
  resetQuiz: jest.fn(),
};
test('uses arrow, Home and End keys with a single tab stop in the result tabs', () => {
  render(<Result {...props} />);
  const score = screen.getByRole('tab', { name: 'Scorecard' });
  const review = screen.getByRole('tab', { name: 'Review answers' });
  expect(score).toHaveAttribute('tabindex', '0');
  expect(review).toHaveAttribute('tabindex', '-1');
  score.focus();
  fireEvent.keyDown(score, { key: 'ArrowRight' });
  expect(review).toHaveFocus();
  expect(review).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveAttribute(
    'aria-labelledby',
    review.id
  );
  fireEvent.keyDown(review, { key: 'Home' });
  expect(score).toHaveFocus();
  fireEvent.keyDown(score, { key: 'End' });
  expect(review).toHaveFocus();
});
test('moves focus into review when its scorecard button is removed', () => {
  render(<Result {...props} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Review 1 correct answers' })
  );
  expect(screen.getByRole('tabpanel')).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Example?' })).toBeVisible();
});
