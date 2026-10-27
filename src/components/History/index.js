import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  difficultyLabel,
  findPersonalBest,
  normalizeTestName,
} from '../../utils/quizHistory';
import RoundName from '../RoundName';
import { formatTimeLimit } from '../../utils/quizProgress';

const History = ({
  rounds,
  personalBests = rounds,
  onClear,
  onRename,
  storageAvailable,
  view = 'recent',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const visibleRounds = view === 'recent' ? rounds : personalBests;
  if (!visibleRounds.length)
    return (
      <section className="history-empty">
        <h2>
          {view === 'bests'
            ? 'No personal bests yet.'
            : 'Your next round starts a record.'}
        </h2>
        <p>
          Play a quiz to see your recent scores and personal bests here. Saved
          on this browser.
        </p>
      </section>
    );
  return (
    <section className="history-section" aria-labelledby="history-title">
      <div className="history-heading">
        <div>
          <h2 id="history-title">
            {view === 'bests' ? 'Personal bests' : 'Recent rounds'}
          </h2>
        </div>
        <span>
          {storageAvailable
            ? 'Saved on this browser · Last 20 rounds'
            : 'History is available for this visit only'}
        </span>
      </div>
      <div className="history-list">
        {(expanded ? visibleRounds : visibleRounds.slice(0, 5)).map((round) => {
          const best = findPersonalBest(personalBests, round);
          return (
            <article className="history-row" key={round.id}>
              <div className="history-score">
                <strong>
                  {round.correctAnswers}
                  <span> / {round.totalQuestions}</span>
                </strong>
              </div>
              <div className="history-topic">
                <RoundName round={round} onRename={onRename} />
                <p>
                  {normalizeTestName(round.customName) && <>{round.topic} · </>}
                  {difficultyLabel(round.difficulty)} · {round.totalQuestions}{' '}
                  questions · {formatTimeLimit(round.timeLimit)}
                  {round.timeLimit > 0 ? ' limit' : ''}
                  {round.mode === 'practice'
                    ? ' · Practice mode'
                    : ' · Exam mode'}
                  {round.attemptNumber
                    ? ` · Attempt ${round.attemptNumber}${
                        round.maxAttempts ? ` of ${round.maxAttempts}` : ''
                      }`
                    : ''}
                  {round.isCustomPreview ? ' · Creator preview' : ''}
                  {round.challengeHost
                    ? ` · Challenge from ${round.challengeHost}`
                    : ''}
                </p>
              </div>
              <span className="history-best">
                {best?.id === round.id ? 'Personal best' : ''}
              </span>
              <time dateTime={round.completedAt}>
                {new Date(round.completedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </article>
          );
        })}
      </div>
      <div className="history-footer">
        {visibleRounds.length > 5 && (
          <button
            type="button"
            className="text-button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? 'Show fewer'
              : `Show all ${visibleRounds.length} rounds`}
          </button>
        )}
        {confirmClear ? (
          <div
            className="clear-history-confirm"
            role="group"
            aria-label="Clear saved rounds"
          >
            <span>Delete your saved rounds?</span>
            <button
              type="button"
              className="text-button text-red"
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              Delete history
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirmClear(false)}
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-button clear-history"
            onClick={() => setConfirmClear(true)}
          >
            Clear history
          </button>
        )}
      </div>
    </section>
  );
};
History.propTypes = {
  view: PropTypes.oneOf(['recent', 'bests']),
  rounds: PropTypes.array.isRequired,
  personalBests: PropTypes.array,
  onClear: PropTypes.func.isRequired,
  onRename: PropTypes.func,
  storageAvailable: PropTypes.bool,
};
History.defaultProps = { storageAvailable: true };
export default History;
