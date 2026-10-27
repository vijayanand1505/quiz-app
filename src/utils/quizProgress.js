import calculateScore from './calculateScore';
import { difficultyLabel, roundKey } from './quizHistory';

export const formatTimeLimit = (seconds) =>
  seconds === 0
    ? 'Untimed'
    : [
        Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h` : '',
        Math.floor((seconds % 3600) / 60)
          ? `${Math.floor((seconds % 3600) / 60)}m`
          : '',
        seconds % 60 ? `${seconds % 60}s` : '',
      ]
        .filter(Boolean)
        .join(' ');
export const formatLabel = (format) =>
  ({ multiple: 'Multiple choice', boolean: 'True / false' }[format] ||
  'Mixed format');
export const progressSettingsLabel = (round) =>
  `${round.topic} · ${difficultyLabel(round.difficulty)} · ${
    round.totalQuestions
  } ${
    round.totalQuestions === 1 ? 'question' : 'questions'
  } · ${formatTimeLimit(round.timeLimit)} · ${formatLabel(round.format)} · ${
    round.mode === 'practice' ? 'Practice' : 'Exam'
  }${round.fromBookmarks ? ' · Saved questions' : ''}`;

export const groupProgressRounds = (rounds) => {
  const groups = new Map();
  rounds.forEach((round) => {
    const key = roundKey(round);
    if (!groups.has(key)) groups.set(key, { key, rounds: [] });
    groups.get(key).rounds.push(round);
  });
  return [...groups.values()]
    .map((group) => {
      const chronological = [...group.rounds].sort(
        (a, b) =>
          Date.parse(a.completedAt) - Date.parse(b.completedAt) ||
          (a.testNumber || 0) - (b.testNumber || 0)
      );
      return {
        ...group,
        rounds: chronological,
        label: progressSettingsLabel(chronological[chronological.length - 1]),
      };
    })
    .sort(
      (a, b) =>
        Date.parse(b.rounds[b.rounds.length - 1].completedAt) -
          Date.parse(a.rounds[a.rounds.length - 1].completedAt) ||
        (b.rounds[b.rounds.length - 1].testNumber || 0) -
          (a.rounds[a.rounds.length - 1].testNumber || 0)
    );
};
export const progressMetrics = (rounds) => {
  if (!rounds.length) return { latest: 0, average: 0, change: null };
  const scores = rounds.map((round) =>
    calculateScore(round.totalQuestions, round.correctAnswers)
  );
  return {
    latest: scores[scores.length - 1],
    average: Number(
      (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
    ),
    change:
      scores.length > 1
        ? Number((scores[scores.length - 1] - scores[0]).toFixed(1))
        : null,
  };
};
