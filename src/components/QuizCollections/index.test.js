import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import QuizCollections from './index';
import { newQuizDraft } from '../../utils/customQuiz';
const draft = { ...newQuizDraft(), title: 'A science quiz' };
const Harness = ({ onEditQuiz = jest.fn() }) => {
  const [model, setModel] = useState({ drafts: [draft], collections: [] });
  return (
    <QuizCollections
      model={model}
      onChange={setModel}
      onEditQuiz={onEditQuiz}
      storage
    />
  );
};
test('creates, assigns, renames and deletes collections while preserving quizzes', () => {
  const onEditQuiz = jest.fn();
  render(<Harness onEditQuiz={onEditQuiz} />);
  fireEvent.change(screen.getByLabelText('New collection name'), {
    target: { value: '  Science  ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
  const select = screen.getByLabelText('Collection for A science quiz');
  fireEvent.change(select, {
    target: {
      value: [...select.options].find((o) => o.text === 'Science').value,
    },
  });
  let collection = screen.getByRole('article', { name: 'Science' });
  expect(within(collection).getByText('1 quiz')).toBeVisible();
  fireEvent.click(
    within(collection).getByRole('button', { name: /A science quiz/ })
  );
  expect(onEditQuiz).toHaveBeenCalledWith(draft.id);
  fireEvent.click(screen.getByRole('button', { name: 'Rename Science' }));
  fireEvent.change(screen.getByLabelText('Collection name'), {
    target: { value: 'Study night' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Study night' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep collection' }));
  expect(screen.getByRole('heading', { name: 'Study night' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Study night' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete collection' }));
  expect(
    screen.queryByRole('heading', { name: 'Study night' })
  ).not.toBeInTheDocument();
  collection = screen.getByRole('article', { name: 'Unfiled quizzes' });
  expect(
    within(collection).getByRole('button', { name: /A science quiz/ })
  ).toBeVisible();
});
test('requires a unique name and keeps the form usable after validation', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Give your collection a name.'
  );
  fireEvent.change(screen.getByLabelText('New collection name'), {
    target: { value: 'Science' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
  fireEvent.change(screen.getByLabelText('New collection name'), {
    target: { value: 'science' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
  expect(screen.getByRole('alert')).toHaveTextContent('already exists');
});
