import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import QuizMode from '../QuizMode';
import QuizCollections from '../QuizCollections';
import {
  attemptLimitLabel,
  MAX_ALLOWED_ATTEMPTS,
} from '../../utils/quizAttempts';
import { appUrl } from '../../utils/scorecard';
import { formatTimeLimit } from '../../utils/quizProgress';
import {
  loadQuizDrafts,
  saveQuizDrafts,
  newQuizDraft,
  newQuestion,
  draftErrors,
  playCustomQuiz,
  createCustomQuizLink,
  MAX_QUIZ_DRAFTS,
  MAX_QUIZ_QUESTIONS,
} from '../../utils/customQuiz';

const QuizBuilder = ({ onPlay, quizActive, isActive, view = 'editor' }) => {
  const [model, setModel] = useState(() => {
    const saved = loadQuizDrafts();
    if (saved.drafts.length) return saved;
    const draft = newQuizDraft();
    return { ...saved, drafts: [draft], selectedId: draft.id };
  });
  const [storage, setStorage] = useState(model.available);
  const [saving, setSaving] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [shareError, setShareError] = useState('');
  const [removed, setRemoved] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const latest = useRef(model);
  const pending = useRef(false);
  const generation = useRef(0);
  const summaryRef = useRef(null);
  const focusAfter = useRef(null);
  latest.current = model;
  const draft = model.drafts.find((item) => item.id === model.selectedId);
  const errors = draftErrors(draft);
  const errorFor = (field) =>
    showErrors
      ? errors.find((error) => error.field === field)?.message
      : undefined;
  useEffect(() => {
    pending.current = true;
    setSaving(true);
    const timer = setTimeout(() => {
      setStorage(saveQuizDrafts(latest.current));
      pending.current = false;
      setSaving(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [model]);
  useEffect(() => {
    const flush = () => {
      if (pending.current) {
        saveQuizDrafts(latest.current);
        pending.current = false;
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      generation.current += 1;
      window.removeEventListener('pagehide', flush);
    };
  }, []);
  useEffect(() => {
    if (!isActive || !focusAfter.current) return;
    document.getElementById(focusAfter.current)?.focus();
    focusAfter.current = null;
  }, [model, isActive, removed, confirmDelete]);
  const invalidate = () => {
    generation.current += 1;
    setBusy(false);
    setLink('');
    setMessage('');
    setShareError('');
  };
  const update = (changes, questionsChanged = false) => {
    invalidate();
    setModel((current) => ({
      ...current,
      drafts: current.drafts.map((item) =>
        item.id !== current.selectedId
          ? item
          : {
              ...item,
              ...changes,
              ...(questionsChanged ? { revision: item.revision + 1 } : {}),
            }
      ),
    }));
  };
  const updateQuestion = (questionId, changes) =>
    update(
      {
        questions: draft.questions.map((q) =>
          q.id === questionId ? { ...q, ...changes } : q
        ),
      },
      true
    );
  const changeDraft = (selectedId) => {
    invalidate();
    setRemoved(null);
    setConfirmDelete(false);
    setShowErrors(false);
    setModel((current) => ({ ...current, selectedId }));
  };
  const addDraft = () => {
    const next = newQuizDraft();
    invalidate();
    setRemoved(null);
    setConfirmDelete(false);
    setShowErrors(false);
    focusAfter.current = 'quiz-title';
    setModel((current) => ({
      ...current,
      drafts: [...current.drafts, next],
      selectedId: next.id,
    }));
  };
  const validate = () => {
    if (!errors.length) return true;
    setShowErrors(true);
    setTimeout(() => summaryRef.current?.focus(), 0);
    return false;
  };
  const play = () => {
    if (quizActive || !validate()) return;
    const quiz = playCustomQuiz(draft);
    onPlay({ ...quiz, settings: { ...quiz.settings, isCustomPreview: true } });
  };
  const share = async () => {
    if (busy || !validate()) return;
    const current = ++generation.current;
    setBusy(true);
    setShareError('');
    setMessage('');
    try {
      const url = await createCustomQuizLink(draft, appUrl());
      if (generation.current === current) {
        setLink(url);
        setMessage('Your quiz link is ready to share.');
      }
    } catch (error) {
      if (generation.current === current) setShareError(error.message);
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Quiz link copied. Send it to someone to play.');
    } catch {
      setMessage('Select and copy the quiz link below.');
    }
  };
  const nativeShare = async () => {
    try {
      await navigator.share({
        title: draft.title,
        text: draft.author
          ? `A quiz by ${draft.author}`
          : 'Try my custom quiz.',
        url: link,
      });
    } catch (error) {
      if (error.name !== 'AbortError')
        setMessage('Use Copy quiz link, or select the link below.');
    }
  };
  const moveQuestion = (index, direction) => {
    const questions = [...draft.questions];
    const target = index + direction;
    [questions[index], questions[target]] = [
      questions[target],
      questions[index],
    ];
    focusAfter.current = `${questions[target].id}-heading`;
    update({ questions }, true);
  };
  const removeQuestion = (index) => {
    setRemoved({ question: draft.questions[index], index });
    const questions = draft.questions.filter((_, i) => i !== index);
    focusAfter.current = `${
      questions[Math.min(index, questions.length - 1)].id
    }-heading`;
    update({ questions }, true);
  };
  const undo = () => {
    const questions = [...draft.questions];
    questions.splice(
      Math.min(removed.index, questions.length),
      0,
      removed.question
    );
    focusAfter.current = `${removed.question.id}-heading`;
    update({ questions }, true);
    setRemoved(null);
  };
  const deleteQuiz = () => {
    const others = model.drafts.filter((item) => item.id !== draft.id);
    const next = others.length ? others : [newQuizDraft()];
    invalidate();
    setRemoved(null);
    setShowErrors(false);
    setConfirmDelete(false);
    focusAfter.current = 'quiz-title';
    setModel((current) => ({
      ...current,
      drafts: next,
      selectedId: next[0].id,
    }));
  };
  const fieldError = (field) =>
    errorFor(field) ? (
      <p className="builder-field-error" id={`${field}-error`}>
        {errorFor(field)}
      </p>
    ) : null;
  const navigation = (
    <nav className="record-navigation" aria-label="Quiz builder navigation">
      <a href="#builder" aria-current={view === 'editor' ? 'page' : undefined}>
        Edit quiz
      </a>
      <a
        href="#builder/collections"
        aria-current={view === 'collections' ? 'page' : undefined}
      >
        Collections
        <span aria-hidden="true">{model.collections?.length || 0}</span>
      </a>
    </nav>
  );
  if (view === 'collections')
    return (
      <div className="builder-page">
        <section className="page-intro">
          <p className="section-kicker">Your quiz library</p>
          <h1>Quiz collections</h1>
          <p className="record-description">
            Keep your quizzes in good company.
          </p>
        </section>
        {navigation}
        <QuizCollections
          model={model}
          onChange={setModel}
          storage={storage}
          onEditQuiz={(id) => {
            changeDraft(id);
            window.location.hash = '#builder';
          }}
        />
      </div>
    );
  return (
    <div className="builder-page">
      <section className="record-intro page-intro">
        <div>
          <p className="section-kicker">Made by you</p>
          <h1>Make it your quiz.</h1>
          <p className="record-description">
            Write the questions, pick the answers, pass it on.
          </p>
        </div>
      </section>
      {navigation}
      <div className="builder-library">
        <div className="field">
          <label htmlFor="builder-drafts">Your quizzes</label>
          <select
            id="builder-drafts"
            value={model.selectedId}
            onChange={(event) => changeDraft(event.target.value)}
          >
            {model.drafts.map((item, index) => (
              <option key={item.id} value={item.id}>
                {item.title.trim() || `Untitled quiz ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={model.drafts.length >= MAX_QUIZ_DRAFTS}
          onClick={addDraft}
        >
          New quiz
        </button>
        <p
          className={
            storage
              ? 'builder-save-status'
              : 'builder-save-status builder-storage-warning'
          }
          role="status"
        >
          {!storage
            ? 'Drafts are available for this visit only. Browser storage is unavailable.'
            : saving
            ? 'Saving draft…'
            : 'Draft saved on this browser.'}
        </p>
      </div>
      {model.drafts.length >= MAX_QUIZ_DRAFTS && (
        <p className="builder-help">
          You have {MAX_QUIZ_DRAFTS} saved quizzes. Delete one to make room for
          another.
        </p>
      )}
      {quizActive && (
        <p className="active-quiz-note">
          Your quiz is still running. You can keep editing here, or{' '}
          <a href="#quiz">return to your quiz</a>.
        </p>
      )}
      {showErrors && errors.length > 0 && (
        <div
          className="builder-errors"
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
        >
          <h2>A few details to finish</h2>
          <p>Check the highlighted fields before playing or sharing.</p>
          <ul>
            {errors.slice(0, 5).map((error) => (
              <li key={error.field}>
                <a
                  href={`#${error.field}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(error.field)?.focus();
                  }}
                >
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
          {errors.length > 5 && (
            <p>There are {errors.length} fields to check in total.</p>
          )}
        </div>
      )}
      <div className="builder-layout">
        <div className="builder-editor">
          <section
            className="surface builder-details"
            aria-labelledby="builder-details-title"
          >
            <h2 id="builder-details-title">About this quiz</h2>
            <div className="field">
              <label htmlFor="quiz-title">Quiz title</label>
              <input
                id="quiz-title"
                value={draft.title}
                onChange={(event) => update({ title: event.target.value })}
                maxLength={60}
                placeholder="Friday film night, perhaps?"
                aria-invalid={!!errorFor('quiz-title')}
                aria-describedby={
                  errorFor('quiz-title') ? 'quiz-title-error' : undefined
                }
              />
              {fieldError('quiz-title')}
            </div>
            <div className="field">
              <label htmlFor="quiz-author">
                Your name <span>(optional)</span>
              </label>
              <input
                id="quiz-author"
                value={draft.author}
                onChange={(event) => update({ author: event.target.value })}
                maxLength={40}
                autoComplete="nickname"
              />
            </div>
            <div className="field">
              <label htmlFor="quiz-description">
                A short introduction <span>(optional)</span>
              </label>
              <textarea
                id="quiz-description"
                value={draft.description}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
                maxLength={240}
                rows={2}
                placeholder="Tell your players what to expect."
              />
            </div>
            <div className="field">
              <label htmlFor="builder-collection">Collection</label>
              <select
                id="builder-collection"
                value={draft.collectionId || ''}
                onChange={(e) => update({ collectionId: e.target.value })}
              >
                <option value="">Unfiled quizzes</option>
                {(model.collections || []).map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <p className="builder-help">
                <a href="#builder/collections">Manage collections</a> ·
                Collections stay on this browser.
              </p>
            </div>
            <QuizMode
              value={draft.mode || 'exam'}
              onChange={(mode) => update({ mode })}
            />
            <div className="field">
              <label htmlFor="builder-attempts">Allowed attempts</label>
              <select
                id="builder-attempts"
                value={draft.maxAttempts ?? 0}
                onChange={(event) =>
                  update({ maxAttempts: Number(event.target.value) })
                }
                aria-describedby="builder-attempts-help"
              >
                <option value={0}>Unlimited attempts</option>
                {Array.from(
                  { length: MAX_ALLOWED_ATTEMPTS },
                  (_, index) => index + 1
                ).map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? 'attempt' : 'attempts'}
                  </option>
                ))}
              </select>
              <p className="builder-help" id="builder-attempts-help">
                Applies to shared quizzes on each player’s browser. Starting
                uses an attempt, including if they leave or refresh. Creator
                previews stay unlimited.
              </p>
            </div>
            <div className="builder-timing">
              <label className="untimed-option">
                <input
                  type="checkbox"
                  checked={draft.timeLimit === 0}
                  onChange={(event) =>
                    update({ timeLimit: event.target.checked ? 0 : 300 })
                  }
                />
                No time limit
              </label>
              {draft.timeLimit > 0 && (
                <div className="field">
                  <label htmlFor="builder-minutes">Time limit in minutes</label>
                  <select
                    id="builder-minutes"
                    value={draft.timeLimit}
                    onChange={(event) =>
                      update({ timeLimit: Number(event.target.value) })
                    }
                  >
                    {[1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180].map(
                      (minutes) => (
                        <option key={minutes} value={minutes * 60}>
                          {minutes} minutes
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
          </section>
          {removed && (
            <div className="builder-undo" role="status">
              <span>Question removed.</span>
              <button
                type="button"
                className="text-button"
                onClick={undo}
                disabled={draft.questions.length >= MAX_QUIZ_QUESTIONS}
              >
                Undo
              </button>
            </div>
          )}
          {draft.questions.map((q, index) => (
            <section
              className="surface builder-question"
              aria-labelledby={`${q.id}-heading`}
              key={q.id}
            >
              <div className="builder-question-heading">
                <h2 id={`${q.id}-heading`} tabIndex={-1}>
                  Question {index + 1}
                </h2>
                <div className="builder-question-actions">
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Move question ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Move question ${index + 1} down`}
                    disabled={index === draft.questions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Remove question ${index + 1}`}
                    disabled={draft.questions.length === 1}
                    onClick={() => removeQuestion(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor={`${q.id}-type`}>Answer format</label>
                <select
                  id={`${q.id}-type`}
                  value={q.type}
                  onChange={(event) =>
                    updateQuestion(q.id, {
                      type: event.target.value,
                      options:
                        event.target.value === 'boolean'
                          ? ['True', 'False']
                          : ['', '', '', ''],
                      correctIndex: null,
                    })
                  }
                  aria-describedby={`${q.id}-type-help`}
                >
                  <option value="multiple">Multiple choice</option>
                  <option value="boolean">True / false</option>
                </select>
                <p className="builder-help" id={`${q.id}-type-help`}>
                  Switching format resets the answers.
                </p>
              </div>
              <div className="field">
                <label htmlFor={`${q.id}-prompt`}>Question text</label>
                <textarea
                  id={`${q.id}-prompt`}
                  value={q.prompt}
                  maxLength={1000}
                  rows={3}
                  onChange={(event) =>
                    updateQuestion(q.id, { prompt: event.target.value })
                  }
                  aria-invalid={!!errorFor(`${q.id}-prompt`)}
                  aria-describedby={
                    errorFor(`${q.id}-prompt`)
                      ? `${q.id}-prompt-error`
                      : undefined
                  }
                />
                {fieldError(`${q.id}-prompt`)}
              </div>
              <fieldset className="builder-answers">
                <legend>Answers — select the correct one</legend>
                {q.options.map((answer, optionIndex) => (
                  <div className="builder-answer" key={optionIndex}>
                    <input
                      type="radio"
                      id={`${q.id}-correct-${optionIndex}`}
                      name={`${q.id}-correct`}
                      checked={q.correctIndex === optionIndex}
                      onChange={() =>
                        updateQuestion(q.id, { correctIndex: optionIndex })
                      }
                      aria-label={`Mark answer ${String.fromCharCode(
                        65 + optionIndex
                      )} as correct`}
                      aria-describedby={
                        errorFor(`${q.id}-correct-0`)
                          ? `${q.id}-correct-0-error`
                          : undefined
                      }
                    />
                    {q.type === 'boolean' ? (
                      <label htmlFor={`${q.id}-correct-${optionIndex}`}>
                        {answer}
                      </label>
                    ) : (
                      <div>
                        <label
                          className="visually-hidden"
                          htmlFor={`${q.id}-answer-${optionIndex}`}
                        >
                          Answer {String.fromCharCode(65 + optionIndex)}
                        </label>
                        <input
                          id={`${q.id}-answer-${optionIndex}`}
                          value={answer}
                          maxLength={200}
                          placeholder={`Answer ${String.fromCharCode(
                            65 + optionIndex
                          )}`}
                          onChange={(event) =>
                            updateQuestion(q.id, {
                              options: q.options.map((text, i) =>
                                i === optionIndex ? event.target.value : text
                              ),
                            })
                          }
                          aria-invalid={
                            !!errorFor(`${q.id}-answer-${optionIndex}`)
                          }
                          aria-describedby={
                            errorFor(`${q.id}-answer-${optionIndex}`)
                              ? `${q.id}-answer-${optionIndex}-error`
                              : undefined
                          }
                        />
                        {fieldError(`${q.id}-answer-${optionIndex}`)}
                      </div>
                    )}
                  </div>
                ))}
                {fieldError(`${q.id}-correct-0`)}
              </fieldset>
            </section>
          ))}
          <button
            type="button"
            className="button builder-add-question"
            disabled={draft.questions.length >= MAX_QUIZ_QUESTIONS}
            onClick={() => {
              const q = newQuestion();
              focusAfter.current = `${q.id}-prompt`;
              update({ questions: [...draft.questions, q] }, true);
            }}
          >
            Add question{' '}
            <span>
              {draft.questions.length} / {MAX_QUIZ_QUESTIONS}
            </span>
          </button>
        </div>
        <aside
          className="surface builder-publish"
          aria-labelledby="builder-publish-title"
        >
          <p className="section-kicker">Ready when you are</p>
          <h2 id="builder-publish-title">Try it. Then share it.</h2>
          <p className="builder-help">
            {draft.questions.length}{' '}
            {draft.questions.length === 1 ? 'question' : 'questions'} ·{' '}
            {formatTimeLimit(draft.timeLimit)} ·{' '}
            {attemptLimitLabel(draft.maxAttempts)}
          </p>
          <p className="builder-help">
            Play through your quiz to check it, or send a link for someone else
            to take it.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={play}
            disabled={quizActive}
          >
            Play quiz
            <Icon name="arrow" size={17} />
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={share}
            disabled={busy}
          >
            {busy ? 'Creating link…' : 'Create quiz link'}
          </button>
          {link && (
            <div className="builder-share">
              <button
                type="button"
                className="button button-primary"
                onClick={copy}
              >
                Copy quiz link
              </button>
              {navigator.share && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={nativeShare}
                >
                  Send quiz
                </button>
              )}
              <label className="share-text-label" htmlFor="builder-quiz-link">
                Quiz link
              </label>
              <textarea
                id="builder-quiz-link"
                className="share-result-text"
                readOnly
                value={link}
                rows={3}
                onFocus={(event) => event.target.select()}
              />
            </div>
          )}
          <p className="share-status" role="status">
            {busy ? 'Creating your quiz link.' : message}
          </p>
          {shareError && (
            <p className="share-error" role="alert">
              {shareError}
            </p>
          )}
          <p className="builder-help">
            Drafts stay on this browser. A shared link opens the version you
            sent; later edits need a new link.
          </p>
          <div className="builder-delete">
            {confirmDelete ? (
              <>
                <p>Delete this quiz draft?</p>
                <button
                  type="button"
                  className="text-button text-red"
                  id="builder-confirm-delete"
                  onClick={deleteQuiz}
                >
                  Delete quiz
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    focusAfter.current = 'builder-delete-button';
                    setConfirmDelete(false);
                  }}
                >
                  Keep quiz
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-button"
                id="builder-delete-button"
                onClick={() => {
                  focusAfter.current = 'builder-confirm-delete';
                  setConfirmDelete(true);
                }}
              >
                Delete draft
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
QuizBuilder.propTypes = {
  view: PropTypes.oneOf(['editor', 'collections']),
  onPlay: PropTypes.func.isRequired,
  quizActive: PropTypes.bool,
  isActive: PropTypes.bool,
};
export default QuizBuilder;
