import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import Main from './index';

const question = {
  question: 'A question?',
  correct_answer: 'Alpha',
  incorrect_answers: ['Beta', 'Gamma', 'Delta'],
};
const success = {
  ok: true,
  json: async () => ({
    response_code: 0,
    results: Array.from({ length: 5 }, () => question),
  }),
};
beforeEach(() => {
  global.fetch = jest.fn();
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const start = () =>
  fireEvent.submit(screen.getByRole('form', { name: 'Quiz setup' }));

test('keeps settings and focuses a recoverable error, then retries successfully', async () => {
  const startQuiz = jest.fn();
  fetch
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(success);
  render(<Main startQuiz={startQuiz} />);
  fireEvent.change(screen.getByLabelText('Subject'), {
    target: { value: '23' },
  });
  start();
  expect(
    screen.getByRole('button', { name: 'Loading questions…' })
  ).toBeDisabled();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  expect(screen.getByLabelText('Subject')).toHaveValue('23');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  start();
  await waitFor(() => expect(startQuiz).toHaveBeenCalledTimes(1));
  expect(startQuiz.mock.calls[0][2]).toMatchObject({
    categoryId: '23',
    topic: 'History',
  });
});

test('starts an untimed quiz with a zero time limit and restores timed presets', async () => {
  const startQuiz = jest.fn();
  fetch.mockResolvedValue(success);
  render(<Main startQuiz={startQuiz} />);
  fireEvent.click(screen.getByLabelText('No time limit'));
  expect(screen.queryByLabelText('minutes')).not.toBeInTheDocument();
  expect(screen.getByText('Untimed round')).toBeInTheDocument();
  start();
  await waitFor(() => expect(startQuiz).toHaveBeenCalled());
  expect(startQuiz.mock.calls[0][1]).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: /The warm-up/ }));
  expect(screen.getByLabelText('No time limit')).not.toBeChecked();
  expect(screen.getByLabelText('minutes')).toHaveValue('120');
});

test('recovers from offline without reloading or losing setup choices', async () => {
  fetch.mockResolvedValue(success);
  render(<Main startQuiz={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Subject'), {
    target: { value: '23' },
  });
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });
  act(() => window.dispatchEvent(new Event('offline')));
  expect(screen.getByText(/Your settings will stay here/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Start the quiz' })).toBeDisabled();
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  act(() => window.dispatchEvent(new Event('online')));
  expect(screen.getByRole('button', { name: 'Start the quiz' })).toBeEnabled();
  expect(screen.getByLabelText('Subject')).toHaveValue('23');
  expect(fetch).not.toHaveBeenCalled();
});

test('respects the five second rate-limit cooldown and avoids duplicate requests', async () => {
  jest.useFakeTimers();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ response_code: 5 }),
  });
  render(<Main startQuiz={jest.fn()} />);
  await act(async () => {
    start();
    start();
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('button', { name: 'Try again in 5s' })
  ).toBeDisabled();
  start();
  expect(fetch).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
});

test('aborts an unfinished request on unmount', () => {
  fetch.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<Main startQuiz={jest.fn()} />);
  start();
  const signal = fetch.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
});

test('passes the chosen practice mode into a new round', async () => {
  const startQuiz = jest.fn();
  fetch.mockResolvedValue(success);
  render(<Main startQuiz={startQuiz} />);
  fireEvent.click(screen.getByRole('radio', { name: /Practice mode/ }));
  start();
  await waitFor(() => expect(startQuiz).toHaveBeenCalled());
  expect(startQuiz.mock.calls[0][2].mode).toBe('practice');
});
