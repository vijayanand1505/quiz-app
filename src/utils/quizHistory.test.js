import {
  HISTORY_KEY,
  loadHistory,
  loadPersonalBests,
  loadLastTestNumber,
  roundTitle,
  roundKey,
  normalizeTestName,
  MAX_TEST_NAME_LENGTH,
  saveHistory,
  findPersonalBest,
  isBetterRound,
} from './quizHistory';

const round = {
  id: 'first',
  completedAt: '2026-10-23T12:00:00.000Z',
  totalQuestions: 5,
  correctAnswers: 3,
  timeTaken: 10000,
  timeLimit: 120,
  topic: 'History',
  categoryId: '23',
  difficulty: 'easy',
  format: '0',
};
beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test('limits recent rounds to 20 while keeping older personal bests', () => {
  const rounds = Array.from({ length: 25 }, (_, index) => ({
    ...round,
    id: String(index),
  }));
  saveHistory(rounds, [round]);
  expect(loadHistory()).toHaveLength(20);
  expect(loadPersonalBests()).toMatchObject([round]);
});
test('ignores malformed or invalid stored history', () => {
  localStorage.setItem(HISTORY_KEY, 'not json');
  expect(loadHistory()).toEqual([]);
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({
      rounds: [null, { ...round, correctAnswers: 8 }, round],
      bests: [round],
    })
  );
  expect(loadHistory()).toEqual([{ ...round, testNumber: 1 }]);
});
test('compares identical settings, preferring accuracy before speed', () => {
  const otherSettings = [
    'categoryId',
    'difficulty',
    'format',
    'totalQuestions',
    'timeLimit',
  ].map((key) => ({
    ...round,
    [key]:
      key === 'totalQuestions' ? 10 : key === 'timeLimit' ? 300 : 'different',
    correctAnswers: 5,
  }));
  expect(findPersonalBest([...otherSettings, round], round)).toEqual(round);
  expect(
    isBetterRound({ ...round, correctAnswers: 4, timeTaken: 20000 }, round)
  ).toBe(true);
  expect(isBetterRound({ ...round, timeTaken: 9000 }, round)).toBe(true);
  expect(
    isBetterRound({ ...round, correctAnswers: 2, timeTaken: 1000 }, round)
  ).toBe(false);
  expect(isBetterRound(round, round)).toBe(false);
});
test('handles storage denied and can clear recent rounds and bests', () => {
  saveHistory([round], [round]);
  saveHistory([]);
  expect(loadHistory()).toEqual([]);
  expect(loadPersonalBests()).toEqual([]);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  expect(saveHistory([round])).toBe(false);
});

test('numbers existing rounds chronologically and uses the same number in personal bests', () => {
  const oldest = {
    ...round,
    id: 'old-best',
    completedAt: '2026-10-21T12:00:00.000Z',
  };
  const older = {
    ...round,
    id: 'older',
    completedAt: '2026-10-22T12:00:00.000Z',
  };
  const newest = {
    ...round,
    id: 'newest',
    completedAt: '2026-10-23T12:00:00.000Z',
  };
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({ rounds: [newest, older], bests: [older, oldest] })
  );
  expect(loadHistory().map((item) => [item.id, item.testNumber])).toEqual([
    ['newest', 3],
    ['older', 2],
  ]);
  expect(loadPersonalBests().map((item) => [item.id, item.testNumber])).toEqual(
    [
      ['older', 2],
      ['old-best', 1],
    ]
  );
  expect(loadLastTestNumber()).toBe(3);
  saveHistory(loadHistory(), loadPersonalBests(), loadLastTestNumber());
  expect(loadHistory().map((item) => item.testNumber)).toEqual([3, 2]);
});

test('continues numbering after older rounds are trimmed and after a refresh', () => {
  const rounds = Array.from({ length: 20 }, (_, index) => ({
    ...round,
    id: String(index),
    testNumber: 100 - index,
  }));
  saveHistory(rounds, [], 100);
  const next = { ...round, id: 'next', testNumber: loadLastTestNumber() + 1 };
  saveHistory([next, ...loadHistory()], [], next.testNumber);
  expect(loadHistory()).toHaveLength(20);
  expect(loadHistory()[0].testNumber).toBe(101);
  expect(loadLastTestNumber()).toBe(101);
  saveHistory([]);
  expect(loadLastTestNumber()).toBe(0);
});

test('uses numbered titles without changing personal-best comparisons', () => {
  expect(roundTitle({ ...round, topic: 'Mixed topics', testNumber: 2 })).toBe(
    'Mixed topics · Test 2'
  );
  expect(roundTitle(round)).toBe('History');
  expect(
    findPersonalBest([{ ...round, testNumber: 1 }], { ...round, testNumber: 2 })
  ).toEqual({ ...round, testNumber: 1 });
});

test('custom titles normalize whitespace, limit length, and preserve numbered fallbacks', () => {
  expect(normalizeTestName('  Friday   history practice  ')).toBe(
    'Friday history practice'
  );
  expect(normalizeTestName('x'.repeat(100))).toHaveLength(MAX_TEST_NAME_LENGTH);
  expect(
    roundTitle({ ...round, testNumber: 7, customName: '  Friday   practice  ' })
  ).toBe('Friday practice · Test 7');
  expect(roundTitle({ ...round, testNumber: 7, customName: '  ' })).toBe(
    'History · Test 7'
  );
  expect(
    roundTitle({ ...round, testNumber: 7, customName: { unexpected: true } })
  ).toBe('History · Test 7');
});

test('custom names survive storage without changing scores, test numbers, or best comparisons', () => {
  const named = {
    ...round,
    testNumber: 7,
    customName: 'Friday history practice',
  };
  saveHistory([named], [named], 7);
  expect(loadHistory()).toEqual([named]);
  expect(loadPersonalBests()).toEqual([named]);
  expect(loadLastTestNumber()).toBe(7);
  expect(roundKey(named)).toBe(roundKey(round));
});

test('persists untimed rounds and keeps them separate from timed personal bests', () => {
  const untimed = { ...round, id: 'untimed', timeLimit: 0 };
  saveHistory([untimed, round]);
  expect(loadHistory()).toEqual(
    expect.arrayContaining([expect.objectContaining(untimed)])
  );
  expect(findPersonalBest([round], untimed)).toBeNull();
  expect(roundKey(untimed)).not.toBe(roundKey(round));
});
