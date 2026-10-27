export const ATTEMPTS_KEY = 'quizapp.custom-attempts.v1';
export const ATTEMPTS_CHANGED = 'quizapp:attempts-changed';
export const MAX_ALLOWED_ATTEMPTS = 10;
export const validAttemptLimit = (value) =>
  value === undefined ||
  (Number.isInteger(value) && value >= 0 && value <= MAX_ALLOWED_ATTEMPTS);
const validKey = (key) =>
  typeof key === 'string' && /^[a-zA-Z0-9_-]{1,80}\.[1-9]\d{0,8}$/.test(key);
const unavailable =
  'Attempt tracking is unavailable. Allow browser storage to start this limited quiz.';

const readAttempts = () => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { counts: {}, available: true };
    if (raw.length > 1024 * 1024) throw new Error('Invalid attempts');
    const data = JSON.parse(raw);
    if (
      data?.v !== 1 ||
      !data.counts ||
      Array.isArray(data.counts) ||
      typeof data.counts !== 'object' ||
      !Object.entries(data.counts).every(
        ([key, count]) =>
          validKey(key) &&
          Number.isSafeInteger(count) &&
          count >= 0 &&
          count < Number.MAX_SAFE_INTEGER
      )
    )
      throw new Error('Invalid attempts');
    return { counts: data.counts, available: true };
  } catch {
    return { counts: {}, available: false };
  }
};
export const getAttemptStatus = (settings) => {
  const limit = settings?.maxAttempts ?? 0;
  if (!settings?.customQuizKey || settings.isCustomPreview)
    return { used: 0, limit, remaining: null, available: true, blocked: false };
  const { counts, available } = readAttempts();
  const used = counts[settings.customQuizKey] || 0;
  return {
    used,
    limit,
    remaining: limit ? Math.max(0, limit - used) : null,
    available,
    blocked: limit > 0 && (!available || used >= limit),
  };
};

// Reserve before the quiz starts. History clearing never resets this ledger.
export const reserveQuizAttempt = async (settings) => {
  const limit = settings.maxAttempts ?? 0;
  if (
    !validKey(settings.customQuizKey) ||
    !validAttemptLimit(settings.maxAttempts)
  )
    return { ok: false, error: 'This quiz has invalid attempt settings.' };
  if (settings.isCustomPreview) return { ok: true, preview: true };
  const reserve = () => {
    const { counts, available } = readAttempts();
    if (!available)
      return limit
        ? { ok: false, error: unavailable }
        : { ok: true, tracked: false };
    const used = counts[settings.customQuizKey] || 0;
    if (limit && used >= limit)
      return {
        ok: false,
        error: 'You have used all attempts for this quiz on this browser.',
      };
    try {
      localStorage.setItem(
        ATTEMPTS_KEY,
        JSON.stringify({
          v: 1,
          counts: { ...counts, [settings.customQuizKey]: used + 1 },
        })
      );
      window.dispatchEvent(new Event(ATTEMPTS_CHANGED));
      return { ok: true, tracked: true, number: used + 1, limit };
    } catch {
      return limit
        ? { ok: false, error: unavailable }
        : { ok: true, tracked: false };
    }
  };
  try {
    // One origin-wide lock also prevents different quizzes overwriting the ledger.
    return navigator.locks?.request
      ? await navigator.locks.request(ATTEMPTS_KEY, reserve)
      : reserve();
  } catch {
    return limit
      ? { ok: false, error: 'Attempt tracking is busy. Please try again.' }
      : { ok: true, tracked: false };
  }
};
export const attemptLimitLabel = (value) =>
  !value
    ? 'Unlimited attempts'
    : `${value} ${value === 1 ? 'attempt' : 'attempts'} per browser`;
