import React, { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { calculateScore } from '../../utils';
import { roundTitle } from '../../utils/quizHistory';
import { groupProgressRounds, progressMetrics } from '../../utils/quizProgress';

const percent = (value) => `${Number(value.toFixed(1))}%`;
const dateLabel = (round) =>
  new Date(round.completedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const ProgressChart = ({ rounds, headingAs: Heading = 'h3' }) => {
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const headingId = useId();
  const selectId = useId();
  const scrollRef = useRef(null);
  const groups = groupProgressRounds(rounds);
  const group = groups.find((item) => item.key === selectedKey) || groups[0];
  const selectedGroupKey = group?.key;
  const roundCount = group?.rounds.length || 0;
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    const keepSelectedVisible = () => {
      const point = viewport.querySelector('[aria-pressed="true"]');
      if (!point) return;
      const bounds = viewport.getBoundingClientRect();
      const item = point.getBoundingClientRect();
      if (item.left < bounds.left)
        viewport.scrollLeft -= bounds.left - item.left;
      else if (item.right > bounds.right)
        viewport.scrollLeft += item.right - bounds.right;
    };
    window.addEventListener('resize', keepSelectedVisible);
    return () => window.removeEventListener('resize', keepSelectedVisible);
  }, [selectedGroupKey, roundCount]);
  if (!group)
    return (
      <section className="progress-section">
        <Heading className="progress-title">Progress over time</Heading>
        <p className="progress-caption">
          Finish a round to start your accuracy chart.
        </p>
      </section>
    );
  const history = group.rounds;
  const metrics = progressMetrics(history);
  const selected =
    history.find((round) => round.id === selectedId) ||
    history[history.length - 1];
  const points = history.map((round, index) => ({
    round,
    x: history.length === 1 ? 50 : (index / (history.length - 1)) * 100,
    y: 100 - calculateScore(round.totalQuestions, round.correctAnswers),
  }));
  const changeLabel =
    metrics.change === null
      ? '—'
      : metrics.change === 0
      ? 'No change'
      : `${metrics.change > 0 ? '+' : '−'}${Math.abs(metrics.change)} pts`;

  return (
    <section className="progress-section" aria-labelledby={headingId}>
      <div className="progress-heading">
        <div>
          <Heading id={headingId} className="progress-title">
            Progress over time
          </Heading>
          <p>Accuracy across your saved recent rounds.</p>
        </div>
        <div className="progress-selector">
          <label htmlFor={selectId}>Compare matching rounds</label>
          <select
            id={selectId}
            value={group.key}
            onChange={(event) => {
              setSelectedKey(event.target.value);
              setSelectedId(null);
            }}
          >
            {groups.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} ({item.rounds.length}{' '}
                {item.rounds.length === 1 ? 'round' : 'rounds'})
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="progress-settings">{group.label}</p>
      <div className="progress-metrics">
        <div>
          <span>Latest accuracy</span>
          <strong>{percent(metrics.latest)}</strong>
        </div>
        <div>
          <span>Average accuracy</span>
          <strong>{percent(metrics.average)}</strong>
        </div>
        <div>
          <span>First to latest</span>
          <strong
            className={
              metrics.change > 0
                ? 'text-green'
                : metrics.change < 0
                ? 'text-red'
                : ''
            }
          >
            {changeLabel}
          </strong>
        </div>
      </div>
      <div className="progress-chart-layout">
        <div className="progress-y-axis" aria-hidden="true">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div
          className="progress-chart-scroll"
          ref={scrollRef}
          tabIndex={0}
          aria-label="Scroll through the accuracy chart"
        >
          <div
            className="progress-chart-canvas"
            style={{
              minWidth: `${Math.max(240, (history.length - 1) * 32 + 28)}px`,
            }}
          >
            <div
              className="progress-plot"
              role="group"
              aria-label="Round accuracy chart"
            >
              <svg
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[0, 50, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="1000"
                    y1={y}
                    y2={y}
                    className="progress-gridline"
                  />
                ))}
                {points.length > 1 && (
                  <polyline
                    points={points
                      .map((point) => `${point.x * 10},${point.y}`)
                      .join(' ')}
                    className="progress-line"
                  />
                )}
              </svg>
              {points.map(({ round, x, y }) => (
                <button
                  type="button"
                  key={round.id}
                  className="progress-point"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={`${roundTitle(round)}, ${percent(
                    100 - y
                  )} correct, ${dateLabel(round)}`}
                  aria-pressed={selected.id === round.id}
                  onClick={() => setSelectedId(round.id)}
                  onFocus={() => setSelectedId(round.id)}
                  onMouseEnter={() => setSelectedId(round.id)}
                >
                  <span />
                </button>
              ))}
            </div>
            <div className="progress-x-axis" aria-hidden="true">
              <span>
                {history[0].testNumber
                  ? `Test ${history[0].testNumber} · `
                  : ''}
                {dateLabel(history[0])}
              </span>
              {history.length > 1 && (
                <span>
                  {history[history.length - 1].testNumber
                    ? `Test ${history[history.length - 1].testNumber} · `
                    : ''}
                  {dateLabel(history[history.length - 1])}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {history.length > 7 && (
        <p className="progress-scroll-hint">
          Swipe or scroll the chart to see more rounds.
        </p>
      )}
      <div className="progress-point-detail" role="status">
        <strong>{roundTitle(selected)}</strong>
        <span>
          {selected.correctAnswers}/{selected.totalQuestions} correct ·{' '}
          {percent(
            calculateScore(selected.totalQuestions, selected.correctAnswers)
          )}{' '}
          · {dateLabel(selected)}
        </span>
      </div>
      <p className="progress-caption">
        {history.length < 2
          ? 'Play one more round with these settings to see a trend. '
          : 'Select a point to see that round. Rounds run from oldest to newest. '}
        Compared rounds use the same subject, difficulty, answer format,
        question count and time limit.
      </p>
    </section>
  );
};
ProgressChart.propTypes = {
  rounds: PropTypes.array.isRequired,
  headingAs: PropTypes.oneOf(['h2', 'h3']),
};
export default ProgressChart;
