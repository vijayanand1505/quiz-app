import React from 'react';
import PropTypes from 'prop-types';
import History from '../History';
import ProgressChart from '../ProgressChart';
import Icon from '../Icon';

const Record = ({
  view = 'recent',
  rounds,
  personalBests,
  onClear,
  onRename,
  storageAvailable,
  quizActive,
  quizCompleted,
  quizUntimed = false,
}) => (
  <div className="record-page">
    <section className="record-intro page-intro">
      <div>
        <p className="section-kicker">Saved on this browser</p>
        <h1>My record</h1>
        <p className="record-description">
          Past rounds, personal bests, and how you’re getting on.
        </p>
      </div>
      <a href="#quiz" className="button button-secondary">
        {quizActive
          ? 'Return to quiz'
          : quizCompleted
          ? 'Back to result'
          : 'Take a quiz'}
        <Icon name="arrow" size={17} />
      </a>
    </section>
    {quizActive && (
      <p className="active-quiz-note" role="status">
        <Icon name="clock" size={16} />
        Your quiz is still running.{' '}
        {quizUntimed
          ? 'Take your time; there is no time limit.'
          : 'The timer continues while you’re here.'}
      </p>
    )}
    <nav className="record-navigation" aria-label="Record navigation">
      <a href="#record" aria-current={view === 'recent' ? 'page' : undefined}>
        Recent rounds<span aria-hidden="true">{rounds.length}</span>
      </a>
      <a
        href="#record/bests"
        aria-current={view === 'bests' ? 'page' : undefined}
      >
        Personal bests<span aria-hidden="true">{personalBests.length}</span>
      </a>
      <a
        href="#record/progress"
        aria-current={view === 'progress' ? 'page' : undefined}
      >
        Progress
      </a>
    </nav>
    {view === 'progress' ? (
      <ProgressChart rounds={rounds} headingAs="h2" />
    ) : (
      <History
        rounds={rounds}
        personalBests={personalBests}
        onClear={onClear}
        onRename={onRename}
        storageAvailable={storageAvailable}
        view={view}
      />
    )}
  </div>
);
Record.propTypes = {
  view: PropTypes.oneOf(['recent', 'bests', 'progress']),
  rounds: PropTypes.array.isRequired,
  personalBests: PropTypes.array.isRequired,
  onClear: PropTypes.func.isRequired,
  onRename: PropTypes.func,
  storageAvailable: PropTypes.bool,
  quizActive: PropTypes.bool,
  quizUntimed: PropTypes.bool,
  quizCompleted: PropTypes.bool,
};
export default Record;
