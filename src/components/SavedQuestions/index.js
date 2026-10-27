import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import { bookmarkKey, questionsFromBookmarks } from '../../utils/bookmarks';
const SavedQuestions = ({
  items,
  available,
  onRemove,
  onRestore,
  onPlay,
  quizActive,
  lockedQuestions = [],
}) => {
  const locked = new Set(lockedQuestions.map(bookmarkKey));
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(() =>
    items.slice(0, 50).map((q) => q.id)
  );
  const [removed, setRemoved] = useState(null);
  const selected = items.filter((q) => selection.includes(q.id)).slice(0, 50);
  const visible = items.filter((q) =>
    `${q.question} ${q.category}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  );
  return (
    <div className="saved-page">
      <section className="record-intro page-intro">
        <div>
          <p className="section-kicker">Keep the good questions</p>
          <h1>Saved questions</h1>
          <p className="record-description">
            A little library to come back to. Saved on this browser.
          </p>
        </div>
        <span className="section-kicker">{items.length} / 200 saved</span>
      </section>
      {!available && (
        <p className="error-notice" role="status">
          Browser storage is unavailable. Changes are available for this visit
          only.
        </p>
      )}
      {quizActive && (
        <p className="active-quiz-note">
          Your quiz is still running; its timer continues.{' '}
          <a href="#quiz">Return to quiz</a> before starting practice.
        </p>
      )}
      {removed && (
        <div className="saved-undo" role="status">
          Question removed.{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onRestore(removed);
              setSelection((ids) => [...ids, removed.id]);
              setRemoved(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      {!items.length ? (
        <section className="surface saved-empty">
          <Icon name="bookmark" size={28} />
          <h2>Worth another look?</h2>
          <p>
            Save questions during a quiz or from your answer review. You can
            practise them here later.
          </p>
          <a href="#quiz" className="button button-primary">
            Take a quiz
            <Icon name="arrow" size={17} />
          </a>
        </section>
      ) : (
        <>
          <section
            className="surface saved-tools"
            aria-label="Practice saved questions"
          >
            <div className="field">
              <label htmlFor="saved-search">Find a saved question</label>
              <input
                id="saved-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions or subjects"
              />
            </div>
            <p>
              Choose up to 50 questions for untimed practice with immediate
              feedback.
            </p>
            <div className="saved-toolbar">
              <button
                type="button"
                className="button button-primary"
                disabled={!selected.length || quizActive}
                onClick={() =>
                  onPlay(questionsFromBookmarks(selected), 0, {
                    topic: 'Saved questions',
                    categoryId: '0',
                    difficulty: '0',
                    format: '0',
                    mode: 'practice',
                    fromBookmarks: true,
                  })
                }
              >
                Practice selected ({selected.length})
                <Icon name="arrow" size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setSelection(visible.slice(0, 50).map((q) => q.id))
                }
              >
                Select visible
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelection([])}
              >
                Clear selection
              </button>
            </div>
            <p className="saved-count" role="status">
              Showing {visible.length} of {items.length} saved questions.{' '}
              {selected.length} selected.
            </p>
          </section>
          {!visible.length && (
            <p className="saved-empty">No saved questions match your search.</p>
          )}
          <div className="saved-list">
            {visible.map((q) => (
              <article className="surface saved-card" key={q.id}>
                <div className="saved-card-top">
                  <label className="saved-select">
                    <input
                      type="checkbox"
                      checked={selection.includes(q.id)}
                      disabled={
                        !selection.includes(q.id) && selected.length >= 50
                      }
                      aria-label={`Select question: ${q.question}`}
                      onChange={(e) =>
                        setSelection((ids) =>
                          e.target.checked
                            ? [...ids, q.id]
                            : ids.filter((id) => id !== q.id)
                        )
                      }
                    />
                    {q.category}
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Remove saved question: ${q.question}`}
                    onClick={() => {
                      setRemoved(q);
                      onRemove(q.id);
                      setSelection((ids) => ids.filter((id) => id !== q.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
                <h2>{q.question}</h2>
                {locked.has(q.id) ? (
                  <p className="field-help">
                    The answer will be available after your current exam.
                  </p>
                ) : (
                  <details>
                    <summary>Show answer</summary>
                    <ul className="saved-answers">
                      {q.options.map((option) => (
                        <li key={option}>
                          {option}
                          {option === q.correct_answer && (
                            <strong>
                              <Icon name="check" size={15} />
                              Correct answer
                            </strong>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
SavedQuestions.propTypes = {
  lockedQuestions: PropTypes.array,
  items: PropTypes.array.isRequired,
  available: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
  onRestore: PropTypes.func.isRequired,
  onPlay: PropTypes.func.isRequired,
  quizActive: PropTypes.bool,
};
export default SavedQuestions;
