import React from 'react';
import PropTypes from 'prop-types';
import { challengeOutcome, challengeTime } from '../../utils/friendChallenge';

const ChallengeComparison = ({
  challenge,
  correctAnswers,
  totalQuestions,
  timeTaken,
}) => (
  <section className="challenge-comparison" aria-labelledby="challenge-outcome">
    <p className="section-kicker">Friend challenge</p>
    <h2 id="challenge-outcome">
      {challengeOutcome(correctAnswers, challenge)}
    </h2>
    <div className="challenge-score-grid">
      {[
        { name: 'You', correct: correctAnswers, time: timeTaken },
        {
          name: challenge.host,
          correct: challenge.correctAnswers,
          time: challenge.timeTaken,
        },
      ].map((player, index) => (
        <div key={index}>
          <span>{player.name}</span>
          <strong>
            {player.correct}
            <small> / {totalQuestions}</small>
          </strong>
          <p>{challengeTime(player.time)}</p>
        </div>
      ))}
    </div>
    <p className="challenge-help">
      Most correct answers wins; equal scores are a draw. Use Share score to
      send your result back.
    </p>
  </section>
);
ChallengeComparison.propTypes = {
  challenge: PropTypes.object.isRequired,
  correctAnswers: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  timeTaken: PropTypes.number.isRequired,
};
export default ChallengeComparison;
