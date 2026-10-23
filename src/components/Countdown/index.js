import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import Swal from 'sweetalert2';
import { timeConverter } from '../../utils';

const Countdown = ({ countdownTime, timeOver, setTimeTaken }) => {
  const totalTime = countdownTime * 1000;
  const untimed = countdownTime === 0;
  const [elapsed, setElapsed] = useState(0);
  const callbacks = useRef({ timeOver, setTimeTaken });
  const startedAt = useRef(Date.now());
  const expired = useRef(false);
  useEffect(() => {
    callbacks.current = { timeOver, setTimeTaken };
  }, [timeOver, setTimeTaken]);

  useEffect(() => {
    const tick = () => {
      const passed = Math.max(0, Date.now() - startedAt.current);
      const measured = untimed ? passed : Math.min(totalTime, passed);
      setElapsed(measured);
      callbacks.current.setTimeTaken(measured);
      if (!untimed && passed >= totalTime && !expired.current) {
        expired.current = true;
        Swal.fire({
          icon: 'info',
          title: 'Time’s up.',
          text: 'Your answers are ready to review.',
          confirmButtonText: 'Check results',
          allowOutsideClick: false,
          returnFocus: false,
          willClose: () => callbacks.current.timeOver(totalTime),
        });
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    // Catch up immediately when returning from a throttled background tab.
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [totalTime, untimed]);

  const remaining = Math.max(0, totalTime - elapsed);
  const displayTime = untimed ? elapsed : Math.ceil(remaining / 1000) * 1000;
  const { hours, minutes, seconds } = timeConverter(displayTime);
  const low = !untimed && remaining > 0 && remaining <= 30000;
  return (
    <>
      <div
        className={`countdown ${low ? 'countdown-low' : ''}`}
        role="timer"
        aria-live="off"
        aria-label={`${
          untimed ? 'Elapsed time, no time limit' : 'Time remaining'
        }: ${hours} hours ${minutes} minutes ${seconds} seconds`}
      >
        <Icon name="clock" size={17} />
        <span className="timer-label">{untimed ? 'Untimed' : 'Time left'}</span>
        <strong>
          {hours}:{minutes}:{seconds}
        </strong>
      </div>
      <span className="visually-hidden" role="status">
        {low ? '30 seconds or less remaining.' : ''}
      </span>
    </>
  );
};
Countdown.propTypes = {
  countdownTime: PropTypes.number.isRequired,
  timeOver: PropTypes.func.isRequired,
  setTimeTaken: PropTypes.func.isRequired,
};
export default Countdown;
