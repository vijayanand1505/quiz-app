import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QuestionNavigator from './index';

test('long quizzes expand to allow direct navigation to every question', () => {
  const onNavigate = jest.fn();
  render(
    <QuestionNavigator
      answers={Array(50).fill(null)}
      questionIndex={0}
      onNavigate={onNavigate}
    />
  );
  expect(
    screen.queryByRole('button', { name: 'Question 50, unanswered' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show questions' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Question 50, unanswered' })
  );
  expect(onNavigate).toHaveBeenCalledWith(49);
  expect(screen.getByRole('status')).toHaveTextContent('0 of 50 answered');
  fireEvent.click(screen.getByRole('button', { name: 'Hide questions' }));
  expect(
    screen.queryByRole('button', { name: 'Question 50, unanswered' })
  ).not.toBeInTheDocument();
});
