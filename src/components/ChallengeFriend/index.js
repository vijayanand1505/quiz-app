import React, { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import { appUrl } from '../../utils/scorecard';
import {
  createChallengeLink,
  MAX_PLAYER_NAME,
  playerName,
} from '../../utils/friendChallenge';

const ChallengeFriend = ({ questions, round }) => {
  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  const generation = useRef(0);
  const titleId = useId();
  useEffect(
    () => () => {
      generation.current += 1;
    },
    []
  );
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const close = () => {
    generation.current += 1;
    setBusy(false);
    dialogRef.current.close();
  };
  const create = async (event) => {
    event.preventDefault();
    if (busy) return;
    const current = ++generation.current;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const url = await createChallengeLink(questions, round, name, appUrl());
      if (generation.current !== current) return;
      setLink(url);
      try {
        localStorage.setItem('quizapp.playerName', playerName(name));
      } catch {
        /* Sharing works without storage. */
      }
    } catch (err) {
      if (generation.current === current) setError(err.message);
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Challenge link copied. Send it to a friend.');
    } catch {
      setMessage('Select and copy the challenge link below.');
    }
  };
  const share = async () => {
    try {
      await navigator.share({
        title: 'A QuizApp challenge',
        text: `${playerName(name) || 'Your friend'} scored ${
          round.correctAnswers
        }/${questions.length}. Can you beat that?`,
        url: link,
      });
    } catch (err) {
      if (err.name !== 'AbortError')
        setMessage('Use Copy challenge link, or select the link below.');
    }
  };
  return (
    <>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => {
          generation.current += 1;
          setBusy(false);
          setLink('');
          setError('');
          setMessage('');
          try {
            setName(localStorage.getItem('quizapp.playerName') || '');
          } catch {
            setName('');
          }
          dialogRef.current.showModal();
          nameRef.current?.focus();
        }}
      >
        <Icon name="share" size={17} />
        Challenge a friend
      </button>
      <dialog
        className="share-dialog challenge-dialog"
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={() => {
          generation.current += 1;
          setBusy(false);
        }}
      >
        <div className="share-heading">
          <div>
            <p className="section-kicker">One round. Two scores.</p>
            <h2 id={titleId}>Challenge a friend</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close challenge dialog"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>
        <p className="share-description">
          Send the exact questions and time limit from this round. Your friend
          will see how their score compares with your {round.correctAnswers}/
          {questions.length}.
        </p>
        <form onSubmit={create} className="challenge-name-form">
          <label htmlFor={`${titleId}-name`}>
            Your name <span>(optional)</span>
          </label>
          <input
            id={`${titleId}-name`}
            ref={nameRef}
            type="text"
            value={name}
            maxLength={MAX_PLAYER_NAME}
            autoComplete="nickname"
            placeholder="How should your friend know you?"
            disabled={busy}
            onChange={(event) => {
              setName(event.target.value);
              setLink('');
              setMessage('');
              setError('');
            }}
          />
          <button
            className="button button-primary"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Creating link…'
              : link
              ? 'Create link again'
              : 'Create challenge link'}
            <Icon name="arrow" size={17} />
          </button>
        </form>
        {link && (
          <div className="challenge-link-area">
            <div className="share-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={copy}
              >
                Copy challenge link
              </button>
              {navigator.share && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={share}
                >
                  <Icon name="share" size={16} />
                  Send challenge
                </button>
              )}
            </div>
            <label className="share-text-label" htmlFor={`${titleId}-link`}>
              Challenge link
            </label>
            <textarea
              id={`${titleId}-link`}
              className="share-result-text"
              readOnly
              value={link}
              onFocus={(event) => event.target.select()}
              rows={3}
            />
            <p className="challenge-help">
              Most correct answers wins. Equal scores are a draw. Your friend
              can send their score back after playing.
            </p>
          </div>
        )}
        <p className="share-status" role="status">
          {busy
            ? 'Creating your challenge link.'
            : message || (link ? 'Your challenge is ready to share.' : '')}
        </p>
        {error && (
          <p className="share-error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </>
  );
};
ChallengeFriend.propTypes = {
  questions: PropTypes.array.isRequired,
  round: PropTypes.object.isRequired,
};
export default ChallengeFriend;
