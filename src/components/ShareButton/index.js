import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import { appUrl, createScorecard, scoreSummary } from '../../utils/scorecard';

const ShareButton = ({ result }) => {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const url = appUrl();
  const summary = result ? scoreSummary(result) : 'Try a round on QuizApp';
  const text = `${summary}\nYour turn? ${url}`;

  useEffect(() => {
    if (!open || !result) return;
    let disposed = false;
    let imageUrl;
    setCard(null);
    setError('');
    setMessage('');
    createScorecard(result, url)
      .then((blob) => {
        if (disposed) return;
        imageUrl = URL.createObjectURL(blob);
        setCard({ blob, imageUrl });
      })
      .catch((err) => {
        if (!disposed) setError(err.message);
      });
    return () => {
      disposed = true;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [open, result, url]);

  const close = () => {
    dialogRef.current.close();
    setOpen(false);
  };
  const share = async () => {
    try {
      const payload = { title: 'My QuizApp score', text: summary, url };
      if (card) {
        const file = new File([card.blob], 'quizapp-score.png', {
          type: 'image/png',
        });
        if (navigator.canShare?.({ files: [file] })) payload.files = [file];
      }
      await navigator.share(payload);
    } catch (err) {
      if (err.name !== 'AbortError')
        setError(
          'Sharing didn’t work. You can download the image or copy your result below.'
        );
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Result copied.');
    } catch {
      setMessage('Select and copy the result text below.');
    }
  };

  return (
    <>
      <button
        type="button"
        className="button button-secondary share-score-button"
        onClick={() => {
          dialogRef.current.showModal();
          setOpen(true);
        }}
      >
        <Icon name="share" size={17} />
        Share score
      </button>
      <dialog
        className="share-dialog"
        ref={dialogRef}
        onCancel={() => setOpen(false)}
        aria-labelledby="share-title"
      >
        <div className="share-heading">
          <div>
            <p className="section-kicker">One for the group chat</p>
            <h2 id="share-title">Share your round</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            aria-label="Close share dialog"
          >
            <Icon name="close" />
          </button>
        </div>
        {card ? (
          <img
            className="scorecard-preview"
            src={card.imageUrl}
            alt={`Scorecard: ${summary}`}
          />
        ) : result && !error ? (
          <p className="share-loading" role="status">
            Preparing your scorecard…
          </p>
        ) : null}
        <p className="share-description">
          Send your score, or save the image for later.
        </p>
        <div className="share-actions">
          {navigator.share && (
            <button
              type="button"
              className="button button-primary"
              onClick={share}
              disabled={Boolean(result) && !card && !error}
            >
              <Icon name="share" size={16} />
              Share
            </button>
          )}
          {card && (
            <a
              className="button button-secondary"
              href={card.imageUrl}
              download={`quizapp-${result.correctAnswers}-of-${result.totalQuestions}.png`}
            >
              <Icon name="download" size={16} />
              Download image
            </a>
          )}
          <button
            type="button"
            className="button button-secondary"
            onClick={copy}
          >
            Copy result
          </button>
        </div>
        <label className="share-text-label" htmlFor="share-result-text">
          Your result and quiz link
        </label>
        <textarea
          id="share-result-text"
          className="share-result-text"
          value={text}
          readOnly
          onFocus={(event) => event.target.select()}
          rows={3}
        />
        {message && (
          <p className="share-status" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="share-error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </>
  );
};
ShareButton.propTypes = { result: PropTypes.object };
export default ShareButton;
