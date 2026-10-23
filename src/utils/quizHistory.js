export const HISTORY_KEY = 'quizapp.rounds.v1';
export const HISTORY_LIMIT = 20;
export const MAX_TEST_NAME_LENGTH = 60;
export const normalizeTestName = (name) =>
  typeof name === 'string'
    ? name.trim().replace(/\s+/g, ' ').slice(0, MAX_TEST_NAME_LENGTH)
    : '';

const isRound = (round) =>
  round &&
  typeof round.id === 'string' &&
  Number.isFinite(Date.parse(round.completedAt)) &&
  Number.isInteger(round.totalQuestions) &&
  round.totalQuestions > 0 &&
  round.totalQuestions <= 50 &&
  Number.isInteger(round.correctAnswers) &&
  round.correctAnswers >= 0 &&
  round.correctAnswers <= round.totalQuestions &&
  Number.isFinite(round.timeTaken) &&
  round.timeTaken >= 0 &&
  Number.isFinite(round.timeLimit) &&
  round.timeLimit >= 0 &&
  typeof round.topic === 'string' &&
  typeof round.categoryId === 'string' &&
  typeof round.difficulty === 'string' &&
  typeof round.format === 'string';

const hasTestNumber = (round) =>
  Number.isSafeInteger(round.testNumber) && round.testNumber > 0;

const numberRecords = (rounds, bests, lastTestNumber = 0) => {
  const records = [
    ...new Map(
      [...rounds, ...bests].map((round) => [round.id, round])
    ).values(),
  ]
    .reverse()
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));
  let latestNumber =
    Number.isSafeInteger(lastTestNumber) && lastTestNumber > 0
      ? lastTestNumber
      : 0;
  records.forEach((round) => {
    if (hasTestNumber(round))
      latestNumber = Math.max(latestNumber, round.testNumber);
  });
  const numbered = new Map(
    records.map((round) => [
      round.id,
      hasTestNumber(round) ? round : { ...round, testNumber: ++latestNumber },
    ])
  );
  return {
    rounds: rounds
      .map((round) => numbered.get(round.id))
      .slice(0, HISTORY_LIMIT),
    bests: bests.map((round) => numbered.get(round.id)),
    lastTestNumber: latestNumber,
  };
};

const readRecords = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const rounds = Array.isArray(saved) ? saved : saved.rounds;
    const bests = Array.isArray(saved) ? saved : saved.bests;
    return numberRecords(
      Array.isArray(rounds) ? rounds.filter(isRound) : [],
      Array.isArray(bests) ? bests.filter(isRound) : [],
      saved?.lastTestNumber
    );
  } catch {
    return { rounds: [], bests: [], lastTestNumber: 0 };
  }
};
export const loadHistory = () => readRecords().rounds;
export const loadPersonalBests = () => readRecords().bests;
export const loadLastTestNumber = () => readRecords().lastTestNumber;
export const saveHistory = (rounds, bests = rounds, lastTestNumber) => {
  try {
    const previousNumber =
      lastTestNumber ??
      (rounds.length || bests.length ? loadLastTestNumber() : 0);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(numberRecords(rounds, bests, previousNumber))
    );
    return true;
  } catch {
    return false;
  }
};

export const roundTitle = (round) => {
  const name = normalizeTestName(round.customName) || round.topic;
  return hasTestNumber(round) ? `${name} · Test ${round.testNumber}` : name;
};

export const roundKey = (round) =>
  [
    round.categoryId,
    round.difficulty,
    round.format,
    round.totalQuestions,
    round.timeLimit,
  ].join('|');
export const isBetterRound = (round, best) =>
  !best ||
  round.correctAnswers > best.correctAnswers ||
  (round.correctAnswers === best.correctAnswers &&
    round.timeTaken < best.timeTaken);
export const findPersonalBest = (rounds, round) =>
  rounds
    .filter((item) => roundKey(item) === roundKey(round))
    .reduce((best, item) => (isBetterRound(item, best) ? item : best), null);
export const difficultyLabel = (difficulty) =>
  difficulty === '0'
    ? 'Mixed levels'
    : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
