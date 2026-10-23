import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Swal from 'sweetalert2';
import Countdown from './index';

jest.mock('sweetalert2', () => ({ fire: jest.fn() }));

test('keeps the timer running across answer edits and finishes with the latest callback', () => {
  jest.useFakeTimers();
  const originalTimeOver = jest.fn();
  const latestTimeOver = jest.fn();
  const setTimeTaken = jest.fn();
  const { rerender, unmount } = render(
    <Countdown
      countdownTime={2}
      timeOver={originalTimeOver}
      setTimeTaken={setTimeTaken}
    />
  );
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:01');
  rerender(
    <Countdown
      countdownTime={2}
      timeOver={latestTimeOver}
      setTimeTaken={setTimeTaken}
    />
  );
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:01');
  act(() => jest.advanceTimersByTime(1000));
  act(() => jest.advanceTimersByTime(1000));
  act(() => Swal.fire.mock.calls[0][0].willClose());
  expect(latestTimeOver).toHaveBeenCalledWith(2000);
  expect(originalTimeOver).not.toHaveBeenCalled();
  unmount();
  jest.useRealTimers();
});

test('catches up to wall-clock time after background throttling and expires only once', () => {
  jest.useFakeTimers();
  Swal.fire.mockClear();
  jest.setSystemTime(new Date('2026-10-24T10:00:00Z'));
  const timeOver = jest.fn();
  const setTimeTaken = jest.fn();
  const { unmount } = render(
    <Countdown
      countdownTime={60}
      timeOver={timeOver}
      setTimeTaken={setTimeTaken}
    />
  );
  act(() => {
    jest.setSystemTime(new Date('2026-10-24T10:00:45Z'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:15');
  expect(screen.getByRole('status')).toHaveTextContent(
    '30 seconds or less remaining.'
  );
  act(() => {
    jest.setSystemTime(new Date('2026-10-24T10:02:00Z'));
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(Swal.fire).toHaveBeenCalledTimes(1);
  expect(Swal.fire.mock.calls[0][0].timer).toBeUndefined();
  expect(setTimeTaken).toHaveBeenLastCalledWith(60000);
  act(() => Swal.fire.mock.calls[0][0].willClose());
  expect(timeOver).toHaveBeenCalledWith(60000);
  unmount();
  jest.useRealTimers();
});

test('records elapsed time without expiring an untimed round', () => {
  jest.useFakeTimers();
  Swal.fire.mockClear();
  const timeOver = jest.fn();
  const setTimeTaken = jest.fn();
  const { unmount } = render(
    <Countdown
      countdownTime={0}
      timeOver={timeOver}
      setTimeTaken={setTimeTaken}
    />
  );
  act(() => jest.advanceTimersByTime(65000));
  expect(screen.getByRole('timer')).toHaveTextContent('Untimed00:01:05');
  expect(setTimeTaken).toHaveBeenLastCalledWith(65000);
  expect(Swal.fire).not.toHaveBeenCalled();
  expect(timeOver).not.toHaveBeenCalled();
  unmount();
  jest.useRealTimers();
});
