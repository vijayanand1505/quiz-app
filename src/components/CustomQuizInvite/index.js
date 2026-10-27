import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import AttemptNotice from '../AttemptNotice';
import useQuizAttempts from '../../hooks/useQuizAttempts';
import { quizModeLabel } from '../../utils/quizMode';
import { openCustomQuiz } from '../../utils/customQuiz';
import { formatTimeLimit } from '../../utils/quizProgress';

const CustomQuizInvite = ({ token, onPlay, quizActive }) => {
  const [state, setState] = useState({ loading: true });
  const [started, setStarted] = useState(false);
  const attempts = useQuizAttempts(state.quiz?.settings);
  const headingRef = useRef(null);
  useEffect(() => {
    let disposed = false;
    setState({ loading: true });
    setStarted(false);
    openCustomQuiz(token)
      .then((quiz) => {
        if (!disposed) setState({ quiz });
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
        <h1>Opening your quiz…</h1>
        <p>Getting the questions ready.</p>
      </section>
    );
  if (state.error)
    return (
      <section className="surface loading-card">
        <h1 ref={headingRef} tabIndex={-1}>
          Can’t open this quiz.
        </h1>
        <p>{state.error}</p>
        <a className="button button-primary" href="#quiz">
          {quizActive ? 'Return to your quiz' : 'Take a quiz'}
        </a>
      </section>
    );
  const { quiz } = state;
  return (
    <div className="challenge-invite">
      <section className="page-intro compact-intro">
        <p className="section-kicker">Made to be shared</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {quiz.title}
        </h1>
      </section>
      <section
        className="surface challenge-invite-card"
        aria-label="Custom quiz invitation"
      >
        <p className="section-kicker">
          {quiz.author ? `A quiz by ${quiz.author}` : 'A custom quiz'}
        </p>
        {quiz.description && (
          <p className="custom-quiz-description">{quiz.description}</p>
        )}
        <p className="challenge-settings">
          {quiz.questions.length}{' '}
          {quiz.questions.length === 1 ? 'question' : 'questions'} ·{' '}
          {formatTimeLimit(quiz.timeLimit)}
          {quiz.timeLimit > 0 ? ' limit' : ''}
          {' · '}
          {quizModeLabel(quiz.settings.mode)}
        </p>
        <p className="challenge-intro-copy">
          {quiz.settings.mode === 'practice'
            ? 'Choose one answer per question. Feedback appears immediately and each answer is final. Your score is shown at the end.'
            : 'Choose one answer per question. You’ll see your score and the correct answers at the end.'}
        </p>
        <AttemptNotice settings={quiz.settings} beforeStart />
        <div className="challenge-invite-actions">
          {quizActive ? (
            <>
              <p role="status">
                Your current quiz is still running. Finish it before starting
                this one.
              </p>
              <a className="button button-primary" href="#quiz">
                Return to your quiz
                <Icon name="arrow" size={17} />
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button-primary"
                disabled={started || attempts.blocked}
                onClick={async () => {
                  setStarted(true);
                  if ((await onPlay(quiz)) === false) setStarted(false);
                }}
              >
                Start this quiz
                <Icon name="arrow" size={17} />
              </button>
              <a className="text-button" href="#quiz">
                Choose a different quiz
              </a>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
CustomQuizInvite.propTypes = {
  token: PropTypes.string.isRequired,
  onPlay: PropTypes.func.isRequired,
  quizActive: PropTypes.bool,
};
export default CustomQuizInvite;
