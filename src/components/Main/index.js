import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  NUM_OF_QUESTIONS,
  QUESTIONS_TYPE,
  COUNTDOWN_TIME,
} from '../../constants';
import { loadQuestions } from '../../utils/loadQuestions';
import Icon from '../Icon';
import QuizMode from '../QuizMode';

const Main = ({ startQuiz }) => {
  const [category, setCategory] = useState('0');
  const [mode, setMode] = useState('exam');
  const [numOfQuestions, setNumOfQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('easy');
  const [questionsType, setQuestionsType] = useState('0');
  const [countdownTime, setCountdownTime] = useState({
    hours: 0,
    minutes: 120,
    seconds: 0,
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [untimed, setUntimed] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  const [retryAt, setRetryAt] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const requestRef = useRef(null);
  const errorRef = useRef(null);
  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      requestRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!retryAt) return;
    const update = () =>
      setRetrySeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [retryAt]);
  useEffect(() => {
    if (error && !errorRef.current?.closest('[hidden]'))
      errorRef.current?.focus();
  }, [error]);
  const totalSeconds =
    countdownTime.hours + countdownTime.minutes + countdownTime.seconds;
  const durationLabel =
    [
      countdownTime.hours ? `${countdownTime.hours / 3600}h` : '',
      countdownTime.minutes ? `${countdownTime.minutes / 60}m` : '',
      countdownTime.seconds ? `${countdownTime.seconds}s` : '',
    ]
      .filter(Boolean)
      .join(' ') || '0s';

  const fetchData = async (event) => {
    event.preventDefault();
    if (
      requestRef.current ||
      Date.now() < retryAt ||
      (!untimed && !totalSeconds)
    )
      return;
    if (!navigator.onLine) {
      setError(
        'You’re offline. Check your connection, then try again. Your settings are still here.'
      );
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setProcessing(true);
    setError(null);
    const params = new URLSearchParams({ amount: numOfQuestions });
    if (category !== '0') params.set('category', category);
    if (difficulty !== '0') params.set('difficulty', difficulty);
    if (questionsType !== '0') params.set('type', questionsType);
    try {
      const questions = await loadQuestions(params, controller.signal);
      if (controller.signal.aborted) return;
      startQuiz(questions, untimed ? 0 : totalSeconds, {
        mode,
        categoryId: category,
        difficulty,
        format: questionsType,
        topic:
          category === '0'
            ? 'Mixed topics'
            : CATEGORIES.find((item) => String(item.value) === category).text,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err.message);
      if (err.retryAfter) {
        setRetryAt(Date.now() + err.retryAfter * 1000);
        setRetrySeconds(err.retryAfter);
      }
    } finally {
      requestRef.current = null;
      if (!controller.signal.aborted) setProcessing(false);
    }
  };

  const presets = [
    {
      title: 'The warm-up',
      detail: '5 questions · Mixed topics · Easy',
      category: '0',
      count: 5,
      difficulty: 'easy',
      time: 120,
    },
    {
      title: 'Film night',
      detail: '10 questions · Films · Medium',
      category: '11',
      count: 10,
      difficulty: 'medium',
      time: 300,
    },
    {
      title: 'No easy ones',
      detail: '10 questions · Mixed topics · Hard',
      category: '0',
      count: 10,
      difficulty: 'hard',
      time: 180,
    },
  ];
  const choosePreset = (preset) => {
    setUntimed(false);
    setCategory(preset.category);
    setNumOfQuestions(preset.count);
    setDifficulty(preset.difficulty);
    setQuestionsType('0');
    setCountdownTime({ hours: 0, minutes: preset.time, seconds: 0 });
    setError(null);
  };

  return (
    <div className="home-page">
      <section className="home-intro">
        <div>
          <p className="section-kicker">A few minutes. A few good questions.</p>
          <h1>
            Know a little
            <br />
            <em>about a lot?</em>
          </h1>
        </div>
        <p className="intro-note">
          Pick a subject, choose your pace, see what sticks. There’s always one
          question that catches you out.
        </p>
      </section>
      <div className="setup-layout">
        <form
          className="surface setup-card"
          onSubmit={fetchData}
          aria-label="Quiz setup"
          aria-busy={processing}
        >
          <div className="card-heading">
            <h2>Set up a round</h2>
            <span>Make it your kind of quiz.</span>
          </div>
          <p className="connection-status" role="status">
            {!online
              ? 'You’re offline. Your settings will stay here while you reconnect.'
              : ''}
          </p>
          {error && (
            <div
              className="error-notice"
              role="alert"
              ref={errorRef}
              tabIndex={-1}
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  document
                    .getElementById('quiz-category')
                    ?.focus({ preventScroll: true });
                }}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          <fieldset className="setup-fields" disabled={processing}>
            <QuizMode value={mode} onChange={setMode} />
            <div className="field-grid topic-fields">
              <div className="field">
                <label htmlFor="quiz-category">Subject</label>
                <select
                  id="quiz-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="0">A bit of everything</option>
                  {CATEGORY_GROUPS.map((group) => (
                    <optgroup label={group.label} key={group.label}>
                      {group.categories.map((item) => (
                        <option key={item.key} value={item.value}>
                          {item.text.replace(/^(Entertainment|Science): /, '')}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div
                  className="topic-shortcuts"
                  role="group"
                  aria-label="Popular subjects"
                >
                  <span>Try:</span>
                  {[
                    { value: '9', label: 'General knowledge' },
                    { value: '17', label: 'Science' },
                    { value: '23', label: 'History' },
                  ].map((topic) => (
                    <button
                      key={topic.value}
                      type="button"
                      aria-pressed={category === topic.value}
                      onClick={() => setCategory(topic.value)}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="quiz-count">Questions</label>
                <select
                  id="quiz-count"
                  value={numOfQuestions}
                  onChange={(e) => setNumOfQuestions(Number(e.target.value))}
                >
                  {NUM_OF_QUESTIONS.map((item) => (
                    <option key={item.key} value={item.value}>
                      {item.text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field difficulty-field">
              <span className="field-label" id="difficulty-label">
                How tough?
              </span>
              <div
                className="difficulty-options"
                role="group"
                aria-labelledby="difficulty-label"
              >
                {[
                  { value: 'easy', title: 'Easy' },
                  { value: 'medium', title: 'Medium' },
                  { value: 'hard', title: 'Hard' },
                  { value: '0', title: 'A mix' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={`difficulty-option ${
                      difficulty === item.value ? 'is-selected' : ''
                    }`}
                    aria-pressed={difficulty === item.value}
                    onClick={() => setDifficulty(item.value)}
                  >
                    {item.title}
                    {difficulty === item.value && (
                      <Icon name="check" size={14} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-grid bottom-fields">
              <div className="field">
                <label htmlFor="quiz-type">Answer format</label>
                <select
                  id="quiz-type"
                  value={questionsType}
                  onChange={(e) => setQuestionsType(e.target.value)}
                >
                  {QUESTIONS_TYPE.map((item) => (
                    <option key={item.key} value={item.value}>
                      {item.value === '0' ? 'A mix of both' : item.text}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="field-label" id="duration-label">
                  Timing
                </span>
                <label className="untimed-option" htmlFor="quiz-untimed">
                  <input
                    id="quiz-untimed"
                    type="checkbox"
                    checked={untimed}
                    onChange={(event) => setUntimed(event.target.checked)}
                    aria-describedby="untimed-help"
                  />
                  No time limit
                </label>
                <p id="untimed-help" className="field-help">
                  Take your time. Elapsed time is recorded.
                </p>
                {!untimed && (
                  <div
                    className="duration-inputs"
                    role="group"
                    aria-labelledby="duration-label"
                  >
                    {['hours', 'minutes', 'seconds'].map((unit) => (
                      <div className="duration-input" key={unit}>
                        <select
                          aria-label={unit}
                          value={countdownTime[unit]}
                          onChange={(e) =>
                            setCountdownTime({
                              ...countdownTime,
                              [unit]: Number(e.target.value),
                            })
                          }
                        >
                          {COUNTDOWN_TIME[unit].map((item) => (
                            <option key={item.key} value={item.value}>
                              {String(item.text).padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span>
                          {unit === 'hours'
                            ? 'hrs'
                            : unit === 'minutes'
                            ? 'min'
                            : 'sec'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </fieldset>
          <div className="setup-card-footer">
            <p aria-live="polite">
              <strong>{numOfQuestions} questions</strong>
              <span> / </span>
              {untimed ? 'Untimed round' : `${durationLabel} on the clock`}
            </p>
            <button
              className="button button-primary"
              type="submit"
              disabled={
                (!untimed && !totalSeconds) ||
                processing ||
                retrySeconds > 0 ||
                !online
              }
            >
              {processing
                ? 'Loading questions…'
                : retrySeconds > 0
                ? `Try again in ${retrySeconds}s`
                : error
                ? 'Try again'
                : 'Start the quiz'}
              {processing ? (
                <span className="small-spinner" aria-hidden="true" />
              ) : (
                <Icon name="arrow" size={18} />
              )}
            </button>
          </div>
          <p className="visually-hidden" role="status">
            {processing
              ? 'Loading questions. Please wait.'
              : retrySeconds > 0
              ? 'You can retry in five seconds.'
              : ''}
          </p>
          {!untimed && !totalSeconds && (
            <p className="time-validation" role="status">
              Set a time limit above zero to start.
            </p>
          )}
        </form>
        <aside className="setup-sidebar">
          <section className="preset-section" aria-label="Suggested rounds">
            <p className="section-kicker">Skip the setup</p>
            <h2>Try one of these.</h2>
            <div className="preset-list">
              {presets.map((preset, index) => {
                const selected =
                  !untimed &&
                  category === preset.category &&
                  numOfQuestions === preset.count &&
                  difficulty === preset.difficulty &&
                  totalSeconds === preset.time &&
                  questionsType === '0';
                return (
                  <button
                    type="button"
                    key={preset.title}
                    disabled={processing}
                    className={`preset-option ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => choosePreset(preset)}
                  >
                    <span className="preset-number">0{index + 1}</span>
                    <span className="preset-text">
                      <strong>{preset.title}</strong>
                      <small>{preset.detail}</small>
                    </span>
                    <Icon name="arrow" size={17} />
                  </button>
                );
              })}
            </div>
          </section>
          <section className="house-rules">
            <h3>A note before you start</h3>
            <p>
              {mode === 'practice'
                ? 'One answer per question. You’ll get feedback immediately, then review your score at the end.'
                : 'One answer per question. You’ll get your score and the correct answers at the end.'}
            </p>
            <p className="house-rule-aside">
              No looking things up. We’re trusting you.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};
Main.propTypes = { startQuiz: PropTypes.func.isRequired };
export default Main;
