import React, { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  MAX_TEST_NAME_LENGTH,
  normalizeTestName,
  roundTitle,
} from '../../utils/quizHistory';

const RoundName = ({ round, onRename, as: Title = 'h3' }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(true);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const wasEditing = useRef(false);
  const inputId = useId();
  const defaultTitle = roundTitle({ ...round, customName: undefined });

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    } else if (wasEditing.current)
      buttonRef.current?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);

  const submit = (event) => {
    event.preventDefault();
    const persisted = onRename(round.id, normalizeTestName(draft)) !== false;
    setSaved(persisted);
    setMessage(
      persisted
        ? 'Test name saved.'
        : 'Name updated for this visit only. Browser storage is unavailable.'
    );
    setEditing(false);
  };

  return (
    <div className="round-name">
      {editing ? (
        <form
          className="round-name-editor"
          onSubmit={submit}
          aria-label={`Rename ${defaultTitle}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setEditing(false);
            }
          }}
        >
          <label htmlFor={inputId}>Test name</label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_TEST_NAME_LENGTH}
            placeholder={defaultTitle}
            aria-describedby={`${inputId}-help`}
            autoComplete="off"
          />
          <p id={`${inputId}-help`} className="round-name-help">
            Up to {MAX_TEST_NAME_LENGTH} characters. Leave blank to restore the
            original name.{' '}
            {round.testNumber ? `Test ${round.testNumber} stays the same.` : ''}
          </p>
          <div className="round-name-actions">
            <button
              type="submit"
              className="button button-primary button-small"
            >
              Save name
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="round-name-display">
          <Title className="test-name-title">{roundTitle(round)}</Title>
          {onRename && (
            <button
              ref={buttonRef}
              type="button"
              className="text-button rename-test"
              aria-label={`Rename ${roundTitle(round)}`}
              onClick={() => {
                setDraft(normalizeTestName(round.customName));
                setMessage('');
                setEditing(true);
              }}
            >
              Rename
            </button>
          )}
        </div>
      )}
      {message && (
        <span
          role="status"
          className={saved ? 'visually-hidden' : 'round-name-warning'}
        >
          {message}
        </span>
      )}
    </div>
  );
};
RoundName.propTypes = {
  round: PropTypes.object.isRequired,
  onRename: PropTypes.func,
  as: PropTypes.oneOf(['h3', 'p']),
};
export default RoundName;
