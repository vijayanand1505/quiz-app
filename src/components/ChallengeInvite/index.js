import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import AttemptNotice from '../AttemptNotice';
import useQuizAttempts from '../../hooks/useQuizAttempts';
import { quizModeLabel } from '../../utils/quizMode';
import { openChallenge } from '../../utils/friendChallenge';
import { difficultyLabel } from '../../utils/quizHistory';
import { formatTimeLimit } from '../../utils/quizProgress';

const ChallengeInvite = ({ token, onStart, quizActive }) => {
  const [state, setState] = useState({ loading: true });
  const headingRef = useRef(null);
  const attempts = useQuizAttempts(state.challenge?.settings);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    let disposed = false;
    setState({ loading: true });
    setAccepted(false);
    openChallenge(token)
      .then((challenge) => {
        if (!disposed) setState({ challenge });
      })
      .catch((error) => {
        if (!disposed) setState({ error: error.message });
      });
    return () => {
      disposed = true;
    };
  }, [token]);
  useEffect(() => {
    if (!state.loading) headingRef.current?.focus({ preventScroll: true });
  }, [state]);
  if (state.loading)
    return (
      <section className="surface loading-card" role="status">
        <h1>Opening your challenge…</h1>
        <p>Getting the round ready.</p>
      </section>
    );
  if (state.error)
    return (
      <section className="surface loading-card">
        <h1 ref={headingRef} tabIndex={-1}>
          Can’t open this challenge.
        </h1>
        <p>{state.error}</p>
        <a className="button button-primary" href="#quiz">
          {quizActive ? 'Return to your quiz' : 'Take a quiz'}
        </a>
      </section>
    );
  const { challenge } = state;
  return (
    <div className="challenge-invite">
      <section className="page-intro compact-intro">
        <p className="section-kicker">A friendly challenge</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {challenge.host} challenged you.
        </h1>
      </section>
      <section
        className="surface challenge-invite-card"
        aria-labelledby="challenge-round-title"
      >
        <p className="section-kicker">The round to beat</p>
        <h2 id="challenge-round-title">{challenge.title}</h2>
        <div className="challenge-target">
          <strong>
            {challenge.correctAnswers}
            <small> / {challenge.questions.length}</small>
          </strong>
          <p>{challenge.host}’s score</p>
        </div>
        <p className="challenge-settings">
          {challenge.questions.length} questions ·{' '}
          {difficultyLabel(challenge.settings.difficulty)} ·{' '}
          {formatTimeLimit(challenge.timeLimit)}
          {challenge.timeLimit > 0 ? ' limit' : ''}
          {' · '}
          {quizModeLabel(challenge.settings.mode)}
        </p>
        <p className="challenge-intro-copy">
          You’ll get the same questions, answer choices, and time limit. Most
          correct answers wins; equal scores are a draw.{' '}
          {challenge.settings.mode === 'practice'
            ? 'Practice mode gives immediate feedback; each answer is final.'
            : 'Exam mode keeps feedback until the end.'}
        </p>
        <AttemptNotice settings={challenge.settings} beforeStart />
        {quizActive ? (
          <div className="challenge-invite-actions">
            <p role="status">
              Your current quiz is still running. Finish it before starting this
              challenge.
            </p>
            <a className="button button-primary" href="#quiz">
              Return to your quiz
              <Icon name="arrow" size={17} />
            </a>
          </div>
        ) : (
          <div className="challenge-invite-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={accepted || attempts.blocked}
              onClick={async () => {
                setAccepted(true);
                if ((await onStart(challenge)) === false) setAccepted(false);
              }}
            >
              Accept challenge
              <Icon name="arrow" size={17} />
            </button>
            <a className="text-button" href="#quiz">
              Choose a different quiz
            </a>
          </div>
        )}
      </section>
    </div>
  );
};
ChallengeInvite.propTypes = {
  token: PropTypes.string.isRequired,
  onStart: PropTypes.func.isRequired,
  quizActive: PropTypes.bool,
};
export default ChallengeInvite;
