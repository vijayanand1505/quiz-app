import {
  ATTEMPTS_KEY,
  getAttemptStatus,
  reserveQuizAttempt,
  validAttemptLimit,
} from './quizAttempts';

const settings = { customQuizKey: 'test.1', maxAttempts: 2 };
beforeEach(() => localStorage.clear());
afterEach(() => {
  jest.restoreAllMocks();
  delete navigator.locks;
});

test('persists starts separately from results and refuses starts after the limit', async () => {
  expect(getAttemptStatus(settings)).toMatchObject({
    used: 0,
    remaining: 2,
    blocked: false,
  });
  expect(await reserveQuizAttempt(settings)).toMatchObject({
    ok: true,
    number: 1,
  });
  expect(await reserveQuizAttempt(settings)).toMatchObject({
    ok: true,
    number: 2,
  });
  expect(getAttemptStatus(settings)).toMatchObject({
    used: 2,
    remaining: 0,
    blocked: true,
  });
  expect(await reserveQuizAttempt(settings)).toMatchObject({ ok: false });
  expect(JSON.parse(localStorage.getItem(ATTEMPTS_KEY)).counts['test.1']).toBe(
    2
  );
  expect(
    await reserveQuizAttempt({ ...settings, customQuizKey: 'test.2' })
  ).toMatchObject({ ok: true, number: 1 });
});

test('old unlimited quizzes track starts without a cap and previews do not consume them', async () => {
  for (let n = 1; n <= 12; n++) {
    expect(await reserveQuizAttempt({ customQuizKey: 'test.1' })).toMatchObject(
      { ok: true, number: n, limit: 0 }
    );
  }
  const preview = { ...settings, isCustomPreview: true };
  expect(getAttemptStatus(preview).blocked).toBe(false);
  expect(await reserveQuizAttempt(preview)).toEqual({
    ok: true,
    preview: true,
  });
  expect(getAttemptStatus(settings).used).toBe(12);
});

test('fails closed for unreadable or corrupt limits but allows unlimited play', async () => {
  localStorage.setItem(ATTEMPTS_KEY, 'broken');
  expect(getAttemptStatus(settings)).toMatchObject({
    available: false,
    blocked: true,
  });
  expect(await reserveQuizAttempt(settings)).toMatchObject({ ok: false });
  expect(await reserveQuizAttempt({ ...settings, maxAttempts: 0 })).toEqual({
    ok: true,
    tracked: false,
  });
  expect(localStorage.getItem(ATTEMPTS_KEY)).toBe('broken');
  localStorage.clear();
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  expect(await reserveQuizAttempt(settings)).toMatchObject({ ok: false });
});

test('does not begin a limited attempt if the count cannot be saved', async () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Full');
  });
  expect(await reserveQuizAttempt(settings)).toMatchObject({ ok: false });
  expect(getAttemptStatus(settings).used).toBe(0);
  expect(await reserveQuizAttempt({ ...settings, maxAttempts: 0 })).toEqual({
    ok: true,
    tracked: false,
  });
});

test('serializes simultaneous starts across quizzes using an origin-wide lock', async () => {
  let queue = Promise.resolve();
  navigator.locks = {
    request: jest.fn((name, callback) => {
      const result = queue.then(callback);
      queue = result.catch(() => {});
      return result;
    }),
  };
  const one = { ...settings, maxAttempts: 1 };
  const results = await Promise.all([
    reserveQuizAttempt(one),
    reserveQuizAttempt(one),
    reserveQuizAttempt({ ...one, customQuizKey: 'other.1' }),
  ]);
  expect(results.map((r) => r.ok)).toEqual([true, false, true]);
  expect(navigator.locks.request.mock.calls.map(([name]) => name)).toEqual([
    ATTEMPTS_KEY,
    ATTEMPTS_KEY,
    ATTEMPTS_KEY,
  ]);
  expect(JSON.parse(localStorage.getItem(ATTEMPTS_KEY)).counts).toEqual({
    'test.1': 1,
    'other.1': 1,
  });
});

test.each([-1, 11, 1.5, '2', null])(
  'rejects invalid limits: %s',
  async (maxAttempts) => {
    expect(validAttemptLimit(maxAttempts)).toBe(false);
    expect(
      await reserveQuizAttempt({ ...settings, maxAttempts })
    ).toMatchObject({ ok: false });
  }
);
