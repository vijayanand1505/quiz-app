import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';

export const answerStatus = (item) =>
  item.user_answer == null
    ? 'unanswered'
    : item.point === 1
    ? 'correct'
    : 'incorrect';
const QNA = ({ questionsAndAnswers, filter, onFilterChange }) => {
  const [localFilter, setLocalFilter] = useState('all');
  const currentFilter = filter ?? localFilter;
  const selectFilter = onFilterChange || setLocalFilter;
  const filters = [
    { value: 'all', label: 'All' },
    { value: 'correct', label: 'Correct' },
    { value: 'incorrect', label: 'Incorrect' },
    { value: 'unanswered', label: 'Unanswered' },
  ];
  const visible = questionsAndAnswers
    .map((item, index) => ({ ...item, number: index + 1 }))
    .filter(
      (item) => currentFilter === 'all' || answerStatus(item) === currentFilter
    );
  return (
    <section className="answer-review" aria-label="Answer review">
      <div className="review-filters" role="group" aria-label="Filter answers">
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={currentFilter === item.value}
            onClick={() => selectFilter(item.value)}
          >
            {item.label}
            <span>
              {item.value === 'all'
                ? questionsAndAnswers.length
                : questionsAndAnswers.filter(
                    (answer) => answerStatus(answer) === item.value
                  ).length}
            </span>
          </button>
        ))}
      </div>
      <p className="review-count" role="status">
        Showing {visible.length} of {questionsAndAnswers.length} questions.
      </p>
      {!visible.length && (
        <div className="surface review-empty">
          <Icon name="book" size={26} />
          <h2>
            {currentFilter === 'all'
              ? 'No answers to review.'
              : `No ${currentFilter} answers.`}
          </h2>
          <p>
            {currentFilter === 'all'
              ? 'Finish a round to see the questions and answers here.'
              : 'Choose another filter to see the rest of your round.'}
          </p>
        </div>
      )}
      {visible.map((item) => {
        const status = answerStatus(item);
        return (
          <article className="surface review-card" key={item.number}>
            <div className="review-heading">
              <span className="eyebrow">
                QUESTION {String(item.number).padStart(2, '0')}
              </span>
              <span className={`answer-status ${status}`}>
                {status === 'correct'
                  ? 'Correct answer'
                  : status === 'incorrect'
                  ? 'Incorrect'
                  : 'Unanswered'}
              </span>
            </div>
            <h2>{item.question}</h2>
            <div className="review-answer-grid">
              <div>
                <span>Your answer</span>
                <p
                  className={
                    status === 'correct'
                      ? 'text-green'
                      : status === 'incorrect'
                      ? 'text-red'
                      : 'text-muted'
                  }
                >
                  {item.user_answer ?? 'Not answered'}
                </p>
              </div>
              <div>
                <span>Correct answer</span>
                <p className="text-green">
                  <Icon name="check" size={16} />
                  {item.correct_answer}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
};
QNA.propTypes = {
  questionsAndAnswers: PropTypes.array.isRequired,
  filter: PropTypes.string,
  onFilterChange: PropTypes.func,
};
export default QNA;
