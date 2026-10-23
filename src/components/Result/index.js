import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Stats from './Stats';
import QNA, { answerStatus } from './QNA';
import Icon from '../Icon';

const Result = ({
  totalQuestions,
  correctAnswers,
  timeTaken,
  questionsAndAnswers,
  replayQuiz,
  resetQuiz,
  round,
  isPersonalBest = false,
  previousBest,
  onRenameTest,
}) => {
  const [activeTab, setActiveTab] = useState('Stats');
  const [reviewFilter, setReviewFilter] = useState('all');
  const panelRef = useRef(null);
  const focusReview = useRef(false);
  useEffect(() => {
    if (focusReview.current) {
      panelRef.current?.focus({ preventScroll: true });
      focusReview.current = false;
    }
  }, [activeTab]);
  const reviewAnswers = (filter) => {
    focusReview.current = true;
    setReviewFilter(filter);
    setActiveTab('QNA');
  };
  const incorrectAnswers = questionsAndAnswers.filter(
    (item) => answerStatus(item) === 'incorrect'
  ).length;
  const unansweredQuestions =
    totalQuestions -
    questionsAndAnswers.filter((item) => answerStatus(item) !== 'unanswered')
      .length;
  return (
    <div className="results-page page-enter">
      <section className="page-intro compact-intro">
        <p className="section-kicker">Round complete</p>
        <h1>How did you get on?</h1>
      </section>
      <div className="result-tabs" role="tablist" aria-label="Quiz results">
        {[
          { name: 'Stats', label: 'Scorecard' },
          { name: 'QNA', label: 'Review answers' },
        ].map((tab) => (
          <button
            id={`tab-${tab.name}`}
            key={tab.name}
            role="tab"
            aria-selected={activeTab === tab.name}
            tabIndex={activeTab === tab.name ? 0 : -1}
            aria-controls="result-panel"
            onClick={() => setActiveTab(tab.name)}
            onKeyDown={(event) => {
              const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 'Stats'
                  : event.key === 'End'
                  ? 'QNA'
                  : activeTab === 'Stats'
                  ? 'QNA'
                  : 'Stats';
              setActiveTab(next);
              document
                .getElementById(`tab-${next}`)
                ?.focus({ preventScroll: true });
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id="result-panel"
        ref={panelRef}
        tabIndex={0}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'Stats' ? (
          <Stats
            round={round}
            isPersonalBest={isPersonalBest}
            previousBest={previousBest}
            incorrectAnswers={incorrectAnswers}
            unansweredQuestions={unansweredQuestions}
            onReview={reviewAnswers}
            onRename={onRenameTest}
            totalQuestions={totalQuestions}
            correctAnswers={correctAnswers}
            timeTaken={timeTaken}
            replayQuiz={replayQuiz}
            resetQuiz={resetQuiz}
          />
        ) : (
          <>
            <QNA
              questionsAndAnswers={questionsAndAnswers}
              filter={reviewFilter}
              onFilterChange={setReviewFilter}
            />
            <div className="review-actions">
              <button className="button button-secondary" onClick={resetQuiz}>
                New quiz
                <Icon name="arrow" size={18} />
              </button>
            </div>
          </>
        )}
      </div>
      <p className="result-record-link">
        <a href="#record">
          View my record <Icon name="arrow" size={15} />
        </a>
      </p>
    </div>
  );
};
Result.propTypes = {
  round: PropTypes.object,
  isPersonalBest: PropTypes.bool,
  previousBest: PropTypes.object,
  onRenameTest: PropTypes.func,
  totalQuestions: PropTypes.number.isRequired,
  correctAnswers: PropTypes.number.isRequired,
  timeTaken: PropTypes.number.isRequired,
  questionsAndAnswers: PropTypes.array.isRequired,
  replayQuiz: PropTypes.func.isRequired,
  resetQuiz: PropTypes.func.isRequired,
};
export default Result;
