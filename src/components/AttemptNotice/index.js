import React from 'react';
import PropTypes from 'prop-types';
import useQuizAttempts from '../../hooks/useQuizAttempts';
import { attemptLimitLabel } from '../../utils/quizAttempts';

const AttemptNotice = ({ settings, current, beforeStart = false }) => {
  const status = useQuizAttempts(settings);
  if (!settings?.customQuizKey) return null;
  if (settings.isCustomPreview)
    return (
      <p className="quiz-attempt-notice">Creator preview · No attempts used.</p>
    );
  return (
    <div className="quiz-attempt-notice">
      {current?.tracked && (
        <strong>
          Attempt {current.number}
          {status.limit ? ` of ${status.limit}` : ''}
        </strong>
      )}
      <p role="status">
        {status.limit
          ? !status.available
            ? 'Attempt tracking is unavailable. Browser storage is required.'
            : status.remaining === 0
            ? 'No attempts remaining on this browser.'
            : `${status.remaining} ${
                status.remaining === 1 ? 'attempt' : 'attempts'
              } remaining on this browser.`
          : attemptLimitLabel(0)}
      </p>
      {beforeStart && status.limit > 0 && (
        <p>
          Starting uses one attempt, even if you leave or refresh. Limits apply
          on this browser only.
        </p>
      )}
    </div>
  );
};
AttemptNotice.propTypes = {
  settings: PropTypes.object,
  current: PropTypes.object,
  beforeStart: PropTypes.bool,
};
export default AttemptNotice;
