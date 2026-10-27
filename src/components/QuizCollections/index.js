import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  MAX_QUIZ_COLLECTIONS,
  newCollectionId,
  normalizeCollectionName,
} from '../../utils/customQuiz';
const QuizCollections = ({ model, onChange, onEditQuiz, storage }) => {
  const collections = model.collections || [];
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef(null);
  const editRef = useRef(null);
  const movedRef = useRef(null);
  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (movedRef.current) {
      document.getElementById(movedRef.current)?.focus();
      movedRef.current = null;
    }
  }, [model]);
  const checkName = (input, exceptId) => {
    const clean = normalizeCollectionName(input);
    if (!clean) {
      setError('Give your collection a name.');
      return null;
    }
    if (
      collections.some(
        (c) =>
          c.id !== exceptId &&
          c.name.toLocaleLowerCase() === clean.toLocaleLowerCase()
      )
    ) {
      setError('A collection with this name already exists.');
      return null;
    }
    setError('');
    return clean;
  };
  const groups = [...collections, { id: '', name: 'Unfiled quizzes' }];
  return (
    <section className="collections-page" aria-label="Quiz collections">
      <div className="surface collection-create">
        <h2>A place for every quiz.</h2>
        <p>
          Group your drafts by subject, occasion, or whatever works for you.
          Each quiz belongs to one collection.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = checkName(name);
            if (!clean || collections.length >= MAX_QUIZ_COLLECTIONS) return;
            onChange({
              ...model,
              collections: [
                ...collections,
                { id: newCollectionId(), name: clean },
              ],
            });
            setName('');
            setMessage(`Created ${clean}.`);
          }}
        >
          <div className="field">
            <label htmlFor="collection-name">New collection name</label>
            <input
              id="collection-name"
              ref={nameRef}
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Interview preparation"
            />
          </div>
          <button
            className="button button-primary"
            type="submit"
            disabled={collections.length >= MAX_QUIZ_COLLECTIONS}
          >
            Create collection
          </button>
        </form>
        {collections.length >= MAX_QUIZ_COLLECTIONS && (
          <p>You can keep up to {MAX_QUIZ_COLLECTIONS} collections.</p>
        )}
        <p role="status">{message}</p>
        {error && (
          <p className="share-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {!storage && (
        <p className="builder-storage-warning" role="status">
          Browser storage is unavailable. Collections are available for this
          visit only.
        </p>
      )}
      <div className="collection-grid">
        {groups.map((collection) => {
          const quizzes = model.drafts.filter(
            (draft) => (draft.collectionId || '') === collection.id
          );
          return (
            <article
              className="surface collection-card"
              key={collection.id || 'unfiled'}
              aria-label={collection.name}
            >
              <div className="collection-heading">
                <h2>{collection.name}</h2>
                <span>
                  {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}
                </span>
              </div>
              {collection.id && (
                <div className="collection-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setEditing(collection.id);
                      setEditName(collection.name);
                      setError('');
                    }}
                  >
                    Rename
                    <span className="visually-hidden"> {collection.name}</span>
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setDeleting(collection.id)}
                  >
                    Delete
                    <span className="visually-hidden"> {collection.name}</span>
                  </button>
                </div>
              )}
              {editing === collection.id && (
                <form
                  className="collection-rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const clean = checkName(editName, collection.id);
                    if (!clean) return;
                    onChange({
                      ...model,
                      collections: collections.map((c) =>
                        c.id === collection.id ? { ...c, name: clean } : c
                      ),
                    });
                    setEditing(null);
                    setMessage('Collection renamed.');
                  }}
                >
                  <div className="field">
                    <label htmlFor="collection-rename">Collection name</label>
                    <input
                      id="collection-rename"
                      ref={editRef}
                      value={editName}
                      maxLength={40}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="button button-secondary">
                    Save name
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </form>
              )}
              {deleting === collection.id && (
                <div className="collection-delete">
                  <p>
                    Delete this collection? Its quizzes will move to Unfiled
                    quizzes.
                  </p>
                  <button
                    type="button"
                    className="text-button text-red"
                    onClick={() => {
                      onChange({
                        ...model,
                        collections: collections.filter(
                          (c) => c.id !== collection.id
                        ),
                        drafts: model.drafts.map((d) =>
                          d.collectionId === collection.id
                            ? { ...d, collectionId: '' }
                            : d
                        ),
                      });
                      setDeleting(null);
                      nameRef.current?.focus();
                      if (editing === collection.id) setEditing(null);
                      setMessage(
                        'Collection deleted. Your quizzes are kept in Unfiled quizzes.'
                      );
                    }}
                  >
                    Delete collection
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setDeleting(null)}
                  >
                    Keep collection
                  </button>
                </div>
              )}
              {!quizzes.length && (
                <p className="collection-empty">
                  No quizzes here yet. Assign a collection while editing a quiz.
                </p>
              )}
              <ul className="collection-quizzes">
                {quizzes.map((draft) => (
                  <li key={draft.id}>
                    <button
                      type="button"
                      className="collection-quiz-link"
                      onClick={() => onEditQuiz(draft.id)}
                    >
                      {draft.title.trim() || 'Untitled quiz'}
                      <span>
                        {draft.questions.length}{' '}
                        {draft.questions.length === 1
                          ? 'question'
                          : 'questions'}{' '}
                        · Edit quiz →
                      </span>
                    </button>
                    <div className="field">
                      <label
                        htmlFor={`move-${draft.id}`}
                        className="visually-hidden"
                      >
                        Collection for {draft.title.trim() || 'Untitled quiz'}
                      </label>
                      <select
                        id={`move-${draft.id}`}
                        value={draft.collectionId || ''}
                        onChange={(e) => {
                          movedRef.current = `move-${draft.id}`;
                          onChange({
                            ...model,
                            drafts: model.drafts.map((d) =>
                              d.id === draft.id
                                ? { ...d, collectionId: e.target.value }
                                : d
                            ),
                          });
                        }}
                      >
                        <option value="">Unfiled quizzes</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
};
QuizCollections.propTypes = {
  model: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onEditQuiz: PropTypes.func.isRequired,
  storage: PropTypes.bool,
};
export default QuizCollections;
