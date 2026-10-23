import React, { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';

const QuestionNavigator = ({
  answers,
  questionIndex,
  onNavigate,
  isActive = true,
}) => {
  const [expanded, setExpanded] = useState(answers.length <= 12);
  const gridId = useId();
  const gridRef = useRef(null);
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const laterUnanswered = answers.findIndex(
    (answer, index) => answer === null && index > questionIndex
  );
  const nextUnanswered =
    laterUnanswered === -1
      ? answers.findIndex((answer) => answer === null)
      : laterUnanswered;

  useEffect(() => {
    if (!expanded || !isActive) return;
    const grid = gridRef.current;
    if (!grid) return;
    const keepCurrentVisible = () => {
      const current = grid.querySelector('[aria-current="step"]');
      if (!current) return;
      const bounds = grid.getBoundingClientRect();
      const item = current.getBoundingClientRect();
      if (item.top < bounds.top) grid.scrollTop -= bounds.top - item.top + 3;
      else if (item.bottom > bounds.bottom)
        grid.scrollTop += item.bottom - bounds.bottom + 3;
    };
    keepCurrentVisible();
    window.addEventListener('resize', keepCurrentVisible);
    return () => window.removeEventListener('resize', keepCurrentVisible);
  }, [questionIndex, expanded, isActive]);

  return (
    <nav className="question-navigator" aria-label="Question navigator">
      <div className="navigator-heading">
        <div>
          <h2>Your questions</h2>
          <p role="status">
            {answeredCount} of {answers.length} answered
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          aria-expanded={expanded}
          aria-controls={gridId}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide questions' : 'Show questions'}
        </button>
      </div>
      <div id={gridId} hidden={!expanded}>
        <div className="navigator-grid" ref={gridRef}>
          {answers.map((answer, index) => (
            <button
              type="button"
              key={index}
              className={`navigator-question ${
                answer !== null ? 'is-answered' : ''
              } ${questionIndex === index ? 'is-current' : ''}`}
              aria-label={`Question ${index + 1}, ${
                answer !== null ? 'answered' : 'unanswered'
              }`}
              aria-current={questionIndex === index ? 'step' : undefined}
              onClick={() => onNavigate(index)}
            >
              <span>{index + 1}</span>
              {answer !== null && <Icon name="check" size={10} />}
            </button>
          ))}
        </div>
        <div className="navigator-footer">
          <div className="navigator-legend" aria-hidden="true">
            <span>
              <i className="legend-answered" />
              Answered
            </span>
            <span>
              <i />
              Unanswered
            </span>
            <span>
              <i className="legend-current" />
              Current
            </span>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate(nextUnanswered)}
            disabled={nextUnanswered === -1 || nextUnanswered === questionIndex}
          >
            Next unanswered
          </button>
        </div>
      </div>
    </nav>
  );
};
QuestionNavigator.propTypes = {
  isActive: PropTypes.bool,
  answers: PropTypes.array.isRequired,
  questionIndex: PropTypes.number.isRequired,
  onNavigate: PropTypes.func.isRequired,
};
export default QuestionNavigator;
