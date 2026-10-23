import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import he from 'he';
import Countdown from '../Countdown';
import Icon from '../Icon';
import QuestionNavigator from '../QuestionNavigator';
import { getLetter } from '../../utils';

const Quiz = ({ data, countdownTime, endQuiz, isActive = true }) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(() => data.map(() => null));
  const [timeTaken, setTimeTaken] = useState(0);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    try {
      return localStorage.getItem('quizapp.shortcuts') !== 'off';
    } catch {
      return true;
    }
  });
  const questionCardRef = useRef(null);
  const questionHeadingRef = useRef(null);
  const previousIndexRef = useRef(questionIndex);
  const selectedAnswer = answers[questionIndex];
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const firstUnanswered = answers.findIndex((answer) => answer === null);

  useEffect(() => {
    if (!isActive) return;
    if (previousIndexRef.current === questionIndex) return;
    previousIndexRef.current = questionIndex;
    questionHeadingRef.current?.focus({ preventScroll: true });

    if (window.matchMedia('(max-width: 760px)').matches) {
      questionCardRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    }
  }, [questionIndex, isActive]);

  const finishQuiz = useCallback(
    (elapsed) => {
      const questionsAndAnswers = data.map((question, index) => {
        const correctAnswer = he.decode(question.correct_answer);
        return {
          question: he.decode(question.question),
          user_answer: answers[index],
          correct_answer: correctAnswer,
          point: answers[index] === correctAnswer ? 1 : 0,
        };
      });

      endQuiz({
        totalQuestions: data.length,
        correctAnswers: questionsAndAnswers.reduce(
          (total, answer) => total + answer.point,
          0
        ),
        timeTaken: elapsed,
        questionsAndAnswers,
      });
    },
    [answers, data, endQuiz]
  );

  const handleNext = useCallback(() => {
    if (selectedAnswer === null) return;
    if (questionIndex === data.length - 1) {
      if (firstUnanswered !== -1) {
        setQuestionIndex(firstUnanswered);
        return;
      }
      finishQuiz(timeTaken);
      return;
    }
    setQuestionIndex((index) => index + 1);
  }, [
    selectedAnswer,
    questionIndex,
    data.length,
    finishQuiz,
    timeTaken,
    firstUnanswered,
  ]);
  const question = data[questionIndex];
  const isLast = questionIndex === data.length - 1;
  const chooseAnswer = useCallback(
    (answer) => {
      setAnswers((current) =>
        current.map((value, index) =>
          index === questionIndex ? answer : value
        )
      );
    },
    [questionIndex]
  );

  useEffect(() => {
    if (!isActive || !shortcutsEnabled) return;
    const onKeyDown = (event) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        event.target.closest?.(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], dialog'
        ) ||
        document.querySelector('.swal2-container, dialog[open]')
      )
        return;
      // Keep shortcuts inside the quiz; leave header links and other controls alone.
      if (event.target.closest?.('a, button:not(.answer-option)')) return;
      if (/^[1-4]$/.test(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option !== undefined) {
          event.preventDefault();
          chooseAnswer(he.decode(option));
        }
      } else if (event.key === 'ArrowLeft' && questionIndex > 0) {
        event.preventDefault();
        setQuestionIndex((index) => index - 1);
      } else if (event.key === 'ArrowRight' && !isLast) {
        event.preventDefault();
        handleNext();
      } else if (
        event.key === 'Enter' &&
        !event.target.closest?.('button, a')
      ) {
        event.preventDefault();
        handleNext();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    isActive,
    shortcutsEnabled,
    chooseAnswer,
    question.options,
    questionIndex,
    isLast,
    handleNext,
  ]);

  return (
    <div className="quiz-page page-enter">
      <section className="page-intro compact-intro">
        <p className="section-kicker">The round is on</p>
        <h1>Let’s see what you know.</h1>
      </section>
      <section className="surface question-card" ref={questionCardRef}>
        <div className="question-toolbar">
          <span className="question-number" id="question-position">
            Question{' '}
            <strong>{String(questionIndex + 1).padStart(2, '0')}</strong>
            <span> / {String(data.length).padStart(2, '0')}</span>
          </span>
          <Countdown
            countdownTime={countdownTime}
            timeOver={finishQuiz}
            setTimeTaken={setTimeTaken}
          />
        </div>
        <div
          className="quiz-progress"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuenow={answeredCount}
          aria-valuetext={`${answeredCount} of ${data.length} questions answered`}
          aria-valuemin={0}
          aria-valuemax={data.length}
        >
          <span style={{ width: `${(answeredCount / data.length) * 100}%` }} />
        </div>
        <QuestionNavigator
          answers={answers}
          questionIndex={questionIndex}
          onNavigate={setQuestionIndex}
          isActive={isActive}
        />
        <div className="question-content">
          <div className="question-tags">
            <span>{he.decode(question.category || 'Trivia')}</span>
            <span>{question.difficulty || 'Challenge'}</span>
          </div>
          <h2
            id="current-question"
            ref={questionHeadingRef}
            tabIndex={-1}
            aria-describedby="question-position"
          >
            {he.decode(question.question)}
          </h2>
          <p className="answer-instruction" id="answer-instruction">
            Select one answer. You can change it before finishing.
          </p>
          <div
            className="answer-options"
            role="group"
            aria-labelledby="current-question"
            aria-describedby="answer-instruction"
          >
            {question.options.map((option, index) => {
              const answer = he.decode(option);
              return (
                <button
                  key={answer}
                  className={`answer-option ${
                    selectedAnswer === answer ? 'is-selected' : ''
                  }`}
                  aria-pressed={selectedAnswer === answer}
                  onClick={() => chooseAnswer(answer)}
                >
                  <span className="answer-letter" aria-hidden="true">
                    {getLetter(index).replace('.', '')}
                  </span>
                  <span>{answer}</span>
                  <span className="answer-indicator" aria-hidden="true">
                    {selectedAnswer === answer && (
                      <Icon name="check" size={15} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="question-footer">
          <button
            className="button button-secondary previous-question"
            onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
            disabled={questionIndex === 0}
          >
            <Icon name="arrow" size={18} />
            Previous
          </button>
          <span>
            {data.length - answeredCount > 0
              ? `${data.length - answeredCount} unanswered`
              : 'All questions answered.'}
          </span>
          <button
            className="button button-primary"
            onClick={handleNext}
            disabled={selectedAnswer === null}
          >
            {isLast
              ? selectedAnswer !== null && firstUnanswered !== -1
                ? 'Review unanswered'
                : 'Finish round'
              : 'Next question'}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </section>
      <p className="quiz-note">Your answers and score are shown at the end.</p>
      <label className="shortcuts-toggle">
        <input
          type="checkbox"
          checked={shortcutsEnabled}
          onChange={(event) => {
            const enabled = event.target.checked;
            setShortcutsEnabled(enabled);
            try {
              localStorage.setItem('quizapp.shortcuts', enabled ? 'on' : 'off');
            } catch {
              /* Works for this round without storage. */
            }
          }}
          aria-describedby="keyboard-help"
        />
        Keyboard shortcuts
      </label>
      <p className="keyboard-hint" id="keyboard-help">
        {shortcutsEnabled ? (
          <>
            <kbd>1</kbd>–<kbd>4</kbd> choose an answer <span>·</span>{' '}
            <kbd>Enter</kbd> continue <span>·</span> <kbd>←</kbd>
            <kbd>→</kbd> move between questions
          </>
        ) : (
          'Shortcuts are off. Use Tab to move between controls, and Space or Enter to activate them.'
        )}
      </p>
    </div>
  );
};
Quiz.propTypes = {
  isActive: PropTypes.bool,
  data: PropTypes.array.isRequired,
  countdownTime: PropTypes.number.isRequired,
  endQuiz: PropTypes.func.isRequired,
};
export default Quiz;
