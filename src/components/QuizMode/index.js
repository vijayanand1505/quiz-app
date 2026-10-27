import React, { useId } from 'react';
import PropTypes from 'prop-types';
const QuizMode = ({ value = 'exam', onChange }) => {
  const id = useId();
  return (
    <fieldset className="quiz-mode-picker">
      <legend>How would you like to play?</legend>
      <div className="quiz-mode-options">
        {[
          [
            'exam',
            'Exam mode',
            'Keep answers editable. See feedback at the end.',
          ],
          [
            'practice',
            'Practice mode',
            'Get feedback straight away. Each answer is final.',
          ],
        ].map(([mode, title, description]) => (
          <label key={mode} className={value === mode ? 'is-selected' : ''}>
            <input
              type="radio"
              name={id}
              value={mode}
              checked={value === mode}
              onChange={() => onChange(mode)}
            />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
QuizMode.propTypes = {
  value: PropTypes.oneOf(['exam', 'practice']),
  onChange: PropTypes.func.isRequired,
};
export default QuizMode;
