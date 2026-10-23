import he from 'he';
import shuffle from './shuffle';

export const QUESTION_TIMEOUT = 15000;
export class QuizLoadError extends Error {
  constructor(message, retryAfter = 0) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

// Reject incomplete or malformed responses before they reach the quiz screen.
const validQuestion = (item) => {
  if (
    !item ||
    typeof item.question !== 'string' ||
    !item.question.trim() ||
    typeof item.correct_answer !== 'string' ||
    !item.correct_answer.trim() ||
    !Array.isArray(item.incorrect_answers) ||
    (item.category !== undefined && typeof item.category !== 'string') ||
    (item.difficulty !== undefined && typeof item.difficulty !== 'string') ||
    ![1, 3].includes(item.incorrect_answers.length) ||
    !item.incorrect_answers.every(
      (answer) => typeof answer === 'string' && answer.trim()
    )
  )
    return false;
  const answers = [item.correct_answer, ...item.incorrect_answers].map(
    (answer) => he.decode(answer).trim()
  );
  return new Set(answers).size === answers.length;
};

export const loadQuestions = async (params, signal) => {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, QUESTION_TIMEOUT);
  try {
    const response = await fetch(`https://opentdb.com/api.php?${params}`, {
      signal: controller.signal,
    });
    if (response.status === 429)
      throw new QuizLoadError(
        'The question service is busy. Wait a few seconds, then try again.',
        5
      );
    if (!response.ok)
      throw new QuizLoadError(
        'The question service is unavailable. Your settings are saved here; please try again.'
      );
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new QuizLoadError(
        'The question service returned an unreadable quiz. Please try again.'
      );
    }
    if (payload?.response_code === 1)
      throw new QuizLoadError(
        'There aren’t enough questions for this combination. Try fewer questions or a different subject or difficulty.'
      );
    if (payload?.response_code === 5)
      throw new QuizLoadError(
        'Please wait a few seconds before requesting another quiz.',
        5
      );
    if (
      payload?.response_code !== 0 ||
      !Array.isArray(payload.results) ||
      payload.results.length !== Number(params.get('amount')) ||
      !payload.results.every(validQuestion)
    ) {
      throw new QuizLoadError(
        'The question service returned an incomplete quiz. Please try again or choose different settings.'
      );
    }
    return payload.results.map((question) => ({
      ...question,
      options: shuffle([
        question.correct_answer,
        ...question.incorrect_answers,
      ]),
    }));
  } catch (error) {
    if (timedOut)
      throw new QuizLoadError(
        'Loading took too long. Check your connection and try again.'
      );
    if (signal?.aborted) throw error;
    if (error instanceof QuizLoadError) throw error;
    throw new QuizLoadError(
      navigator.onLine === false
        ? 'You’re offline. Check your connection, then try again. Your settings are still here.'
        : 'We couldn’t load the questions. Check your connection and try again.'
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
};
