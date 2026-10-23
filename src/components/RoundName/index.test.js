import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RoundName from './index';

const round = { id: 'round-7', topic: 'Mixed topics', testNumber: 7 };
const Harness = ({ initial = round, onRename = jest.fn(), saved = true }) => {
  const [current, setCurrent] = useState(initial);
  return (
    <RoundName
      round={current}
      onRename={(id, customName) => {
        onRename(id, customName);
        setCurrent({ ...current, customName });
        return saved;
      }}
    />
  );
};

test('saves a trimmed custom name and retains the test number', () => {
  const onRename = jest.fn();
  render(<Harness onRename={onRename} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Rename Mixed topics · Test 7' })
  );
  const input = screen.getByRole('textbox', { name: 'Test name' });
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: '  Friday   practice  ' } });
  fireEvent.submit(
    screen.getByRole('form', { name: 'Rename Mixed topics · Test 7' })
  );
  expect(onRename).toHaveBeenCalledWith('round-7', 'Friday practice');
  expect(
    screen.getByRole('heading', { name: 'Friday practice · Test 7' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Rename Friday practice · Test 7' })
  ).toHaveFocus();
});

test('cancel and Escape discard edits without calling the save handler', () => {
  const onRename = jest.fn();
  render(<Harness onRename={onRename} />);
  const start = () =>
    fireEvent.click(
      screen.getByRole('button', { name: 'Rename Mixed topics · Test 7' })
    );
  start();
  fireEvent.change(screen.getByRole('textbox', { name: 'Test name' }), {
    target: { value: 'Discard this' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  start();
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Test name' }), {
    key: 'Escape',
  });
  expect(onRename).not.toHaveBeenCalled();
  expect(
    screen.getByRole('heading', { name: 'Mixed topics · Test 7' })
  ).toBeInTheDocument();
});

test('a blank name restores the original title', () => {
  const onRename = jest.fn();
  render(
    <Harness
      initial={{ ...round, customName: 'Friday practice' }}
      onRename={onRename}
    />
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Rename Friday practice · Test 7' })
  );
  expect(screen.getByRole('textbox', { name: 'Test name' })).toHaveValue(
    'Friday practice'
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Test name' }), {
    target: { value: '   ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  expect(onRename).toHaveBeenCalledWith('round-7', '');
  expect(
    screen.getByRole('heading', { name: 'Mixed topics · Test 7' })
  ).toBeInTheDocument();
});

test('reports when a name could only be saved for the current visit', () => {
  render(<Harness saved={false} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Rename Mixed topics · Test 7' })
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Test name' }), {
    target: { value: 'Local practice' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  expect(screen.getByRole('status')).toHaveTextContent(
    'Name updated for this visit only.'
  );
  expect(
    screen.getByRole('heading', { name: 'Local practice · Test 7' })
  ).toBeInTheDocument();
});
