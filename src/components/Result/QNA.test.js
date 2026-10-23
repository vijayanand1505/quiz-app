import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QNA from './QNA';

const questionsAndAnswers = [
  { question: 'First?', user_answer: 'A', correct_answer: 'A', point: 1 },
  { question: 'Second?', user_answer: 'B', correct_answer: 'C', point: 0 },
  { question: 'Third?', user_answer: null, correct_answer: 'D', point: 0 },
];
test('filters correct, incorrect, and unanswered questions while retaining original numbering', () => {
  render(<QNA questionsAndAnswers={questionsAndAnswers} />);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Incorrect 1' }));
  expect(screen.getByRole('heading', { name: 'Second?' })).toBeInTheDocument();
  expect(screen.getByText('QUESTION 02')).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Third?' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Unanswered 1' }));
  expect(screen.getByText('QUESTION 03')).toBeInTheDocument();
  expect(screen.getByText('Not answered')).toBeInTheDocument();
  expect(screen.getByText('D')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Correct 1' }));
  expect(screen.getByRole('heading', { name: 'First?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All 3' }));
  expect(screen.getAllByRole('article')).toHaveLength(3);
});
test('shows an empty state for a filter with no matching answers', () => {
  render(<QNA questionsAndAnswers={[questionsAndAnswers[0]]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Incorrect 0' }));
  expect(
    screen.getByRole('heading', { name: 'No incorrect answers.' })
  ).toBeInTheDocument();
});
