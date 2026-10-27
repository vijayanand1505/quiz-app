import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SavedQuestions from './index';
import { makeBookmark } from '../../utils/bookmarks';
const items = ['Science', 'History'].map((category) =>
  makeBookmark({
    question: `${category} question?`,
    category,
    options: ['True', 'False'],
    correct_answer: 'True',
  })
);
test('searches saved questions and starts only the selected questions as untimed practice', () => {
  const onPlay = jest.fn();
  render(
    <SavedQuestions
      items={items}
      available
      onPlay={onPlay}
      onRemove={jest.fn()}
      onRestore={jest.fn()}
    />
  );
  fireEvent.click(screen.getByLabelText('Select question: History question?'));
  fireEvent.change(screen.getByLabelText('Find a saved question'), {
    target: { value: 'Science' },
  });
  expect(
    screen.queryByRole('heading', { name: 'History question?' })
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Practice selected (1)' })
  );
  expect(onPlay).toHaveBeenCalledWith(
    [expect.objectContaining({ question: 'Science question?' })],
    0,
    expect.objectContaining({ mode: 'practice', fromBookmarks: true })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(
    screen.getByRole('button', { name: 'Practice selected (0)' })
  ).toBeDisabled();
});
test('removing a question offers undo and a running quiz blocks another start', () => {
  const onRemove = jest.fn(),
    onRestore = jest.fn();
  render(
    <SavedQuestions
      items={items}
      available
      onPlay={jest.fn()}
      onRemove={onRemove}
      onRestore={onRestore}
      quizActive
    />
  );
  expect(
    screen.getByRole('button', { name: 'Practice selected (2)' })
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Remove saved question: Science question?',
    })
  );
  expect(onRemove).toHaveBeenCalledWith(items[0].id);
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onRestore).toHaveBeenCalledWith(items[0]);
});

test('keeps an active exam question hidden in the saved library until the exam finishes', () => {
  const props = {
    items: [items[0]],
    available: true,
    onPlay: jest.fn(),
    onRemove: jest.fn(),
    onRestore: jest.fn(),
    quizActive: true,
  };
  const locked = {
    question: 'Science question?',
    category: 'Science',
    options: ['True', 'False'],
    correct_answer: 'True',
  };
  const { rerender } = render(
    <SavedQuestions {...props} lockedQuestions={[locked]} />
  );
  expect(
    screen.getByText('The answer will be available after your current exam.')
  ).toBeVisible();
  expect(screen.queryByText('Show answer')).not.toBeInTheDocument();
  rerender(
    <SavedQuestions {...props} quizActive={false} lockedQuestions={[]} />
  );
  expect(screen.getByText('Show answer')).toBeVisible();
});
