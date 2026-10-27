import React from 'react';
import PropTypes from 'prop-types';
import ShareButton from '../ShareButton';
import Icon from '../Icon';
import AttemptNotice from '../AttemptNotice';
import { quizModeLabel } from '../../utils/quizMode';
import { calculateScore, timeConverter } from '../../utils';
import {
  difficultyLabel,
  roundTitle,
  normalizeTestName,
} from '../../utils/quizHistory';
import RoundName from '../RoundName';
import ChallengeFriend from '../ChallengeFriend';
import ChallengeComparison from '../ChallengeComparison';

const Stats = ({
  totalQuestions,
  correctAnswers,
  timeTaken,
  replayQuiz,
  resetQuiz,
  round,
  isPersonalBest = false,
  previousBest,
  incorrectAnswers = totalQuestions - correctAnswers,
  unansweredQuestions = 0,
  onReview,
  onRename,
  challenge,
  questions,
  attemptSettings,
  currentAttempt,
  replayDisabled = false,
}) => {
  const score = calculateScore(totalQuestions, correctAnswers);
  const { hours, minutes, seconds } = timeConverter(timeTaken);
  return (
    <section className="surface results-card">
      {challenge && (
        <ChallengeComparison
          challenge={challenge}
          correctAnswers={correctAnswers}
          totalQuestions={totalQuestions}
          timeTaken={timeTaken}
        />
      )}
      {isPersonalBest && (
        <div className="personal-best-notice" role="status">
          <Icon name="trophy" size={21} />
          <div>
            <strong>New personal best</strong>
            <p>
              {roundTitle(round)} · {difficultyLabel(round.difficulty)} ·{' '}
              {round.totalQuestions} questions. Previously{' '}
              {previousBest.correctAnswers}/{previousBest.totalQuestions}
              {previousBest.correctAnswers === correctAnswers
                ? ' — this time, a little faster.'
                : '.'}
            </p>
          </div>
        </div>
      )}
      {round && (
        <div className="result-round-label">
          <RoundName round={round} onRename={onRename} as="p" />
          <p className="round-subject">
            {normalizeTestName(round.customName) && <>{round.topic} · </>}
            {difficultyLabel(round.difficulty)}
            {round.timeLimit === 0 ? ' · Untimed' : ''}
          </p>
        </div>
      )}
      <div className="score-section">
        <div className="score-total">
          <span>Your score</span>
          <strong>
            {correctAnswers}
            <small> / {totalQuestions}</small>
          </strong>
          <p>answered correctly</p>
        </div>
        <div className="score-message">
          <h2>
            {score === 100
              ? 'A clean sweep.'
              : score >= 80
              ? 'You know your stuff.'
              : score >= 60
              ? 'A good round.'
              : 'A tricky round.'}
          </h2>
          <p>
            {score === 100
              ? 'Every answer right. Try a harder round?'
              : `${totalQuestions - correctAnswers} ${
                  totalQuestions - correctAnswers === 1
                    ? 'question'
                    : 'questions'
                } to revisit. Have a look at the answers, or give it another go.`}
          </p>
          <span className="passing-note">
            {score}% correct · Passing score: 60%
          </span>
        </div>
      </div>
      <div className="result-breakdown" aria-label="Answer breakdown">
        {[
          { filter: 'correct', label: 'Correct', count: correctAnswers },
          { filter: 'incorrect', label: 'Incorrect', count: incorrectAnswers },
          {
            filter: 'unanswered',
            label: 'Unanswered',
            count: unansweredQuestions,
          },
        ].map((item) => (
          <button
            type="button"
            key={item.filter}
            className={`breakdown-item ${item.filter}`}
            onClick={() => onReview?.(item.filter)}
            disabled={!onReview}
            aria-label={`Review ${
              item.count
            } ${item.label.toLowerCase()} answers`}
          >
            <strong>{item.count}</strong>
            <span>
              {item.label}
              <Icon name="arrow" size={14} />
            </span>
          </button>
        ))}
      </div>
      <div className="result-metrics">
        <div>
          <span>Questions</span>
          <strong>
            {totalQuestions}
            <small> questions</small>
          </strong>
        </div>
        <div>
          <span>Accuracy</span>
          <strong>
            {score}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>Time taken</span>
          <strong>
            {Number(hours) > 0 ? `${Number(hours)}h ` : ''}
            {Number(minutes)}
            <small>m </small>
            {Number(seconds)}
            <small>s</small>
          </strong>
        </div>
      </div>
      {replayDisabled && (
        <p className="attempt-replay-note" id="replay-attempt-note">
          {!attemptSettings?.maxAttempts
            ? ''
            : 'Another attempt is not available on this browser. You can still review your answers or start a different quiz.'}
        </p>
      )}
      <div className="result-attempts">
        {round && (
          <p className="round-mode-label">
            {quizModeLabel(round.mode)}
            {round.fromBookmarks ? ' · Saved questions' : ''}
          </p>
        )}
        <AttemptNotice settings={attemptSettings} current={currentAttempt} />
      </div>
      <div className="results-actions">
        <button
          className="button button-primary"
          onClick={replayQuiz}
          disabled={replayDisabled}
          aria-describedby={replayDisabled ? 'replay-attempt-note' : undefined}
        >
          <Icon name="refresh" size={18} /> Play again
        </button>
        <button className="button button-secondary" onClick={resetQuiz}>
          New quiz
          <Icon name="arrow" size={18} />
        </button>
        {questions?.length && round ? (
          <ChallengeFriend questions={questions} round={round} />
        ) : null}
        <ShareButton
          result={
            round || {
              totalQuestions,
              correctAnswers,
              timeTaken,
              topic: 'Trivia',
              difficulty: '0',
            }
          }
        />
      </div>
    </section>
  );
};
Stats.propTypes = {
  round: PropTypes.object,
  attemptSettings: PropTypes.object,
  currentAttempt: PropTypes.object,
  replayDisabled: PropTypes.bool,
  challenge: PropTypes.object,
  questions: PropTypes.array,
  isPersonalBest: PropTypes.bool,
  previousBest: PropTypes.object,
  incorrectAnswers: PropTypes.number,
  unansweredQuestions: PropTypes.number,
  onReview: PropTypes.func,
  onRename: PropTypes.func,
  totalQuestions: PropTypes.number.isRequired,
  correctAnswers: PropTypes.number.isRequired,
  timeTaken: PropTypes.number.isRequired,
  replayQuiz: PropTypes.func.isRequired,
  resetQuiz: PropTypes.func.isRequired,
};
export default Stats;
