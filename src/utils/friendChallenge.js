import he from 'he';
import { validQuizMode } from './quizMode';
import { validAttemptLimit } from './quizAttempts';
import { normalizeTestName } from './quizHistory';
import {
  packQuizLink,
  unpackQuizLink,
  MAX_SHARED_LINK_LENGTH,
  MAX_SHARED_BYTES,
} from './sharedQuizLink';

export const CHALLENGE_PREFIX = '#challenge=';
export const MAX_CHALLENGE_LINK_LENGTH = MAX_SHARED_LINK_LENGTH;
export const MAX_CHALLENGE_BYTES = MAX_SHARED_BYTES;
export const MAX_PLAYER_NAME = 40;
const invalid = () =>
  new Error(
    'This challenge link is incomplete or invalid. Ask your friend to send a new one.'
  );
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export const playerName = (name) =>
  typeof name === 'string'
    ? name.trim().replace(/\s+/g, ' ').slice(0, MAX_PLAYER_NAME)
    : '';

// Compact, versioned data keeps the exact question and answer order in the link.
const validate = (payload) => {
  if (
    !payload ||
    payload.v !== 1 ||
    !validQuizMode(payload.mode) ||
    !validAttemptLimit(payload.maxAttempts) ||
    ((payload.maxAttempts ?? 0) > 0 && !payload.customQuizKey) ||
    !text(payload.host, MAX_PLAYER_NAME) ||
    !text(payload.title, 160) ||
    !Array.isArray(payload.settings) ||
    payload.settings.length !== 5 ||
    !Array.isArray(payload.questions) ||
    payload.questions.length < 1 ||
    payload.questions.length > 50 ||
    (payload.customQuizKey !== undefined &&
      (typeof payload.customQuizKey !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,80}\.[1-9]\d{0,8}$/.test(payload.customQuizKey))) ||
    !Array.isArray(payload.score) ||
    payload.score.length !== 2
  )
    throw invalid();
  const [categoryId, difficulty, format, timeLimit, topic] = payload.settings;
  if (
    !text(categoryId, 4) ||
    !/^\d+$/.test(categoryId) ||
    !['0', 'easy', 'medium', 'hard', 'custom'].includes(difficulty) ||
    !['0', 'multiple', 'boolean'].includes(format) ||
    !Number.isInteger(timeLimit) ||
    timeLimit < 0 ||
    timeLimit > 359999 ||
    !text(topic, 160)
  )
    throw invalid();
  const [correctAnswers, timeTaken] = payload.score;
  if (
    !Number.isInteger(correctAnswers) ||
    correctAnswers < 0 ||
    correctAnswers > payload.questions.length ||
    !Number.isFinite(timeTaken) ||
    timeTaken < 0 ||
    timeTaken > (timeLimit ? timeLimit * 1000 : 7 * 86400000)
  )
    throw invalid();
  const questions = payload.questions.map((entry) => {
    if (!Array.isArray(entry) || entry.length !== 5) throw invalid();
    const [question, options, correctIndex, category, level] = entry;
    if (
      !text(question, payload.customQuizKey ? 16384 : 4096) ||
      !Array.isArray(options) ||
      ![2, 4].includes(options.length) ||
      !options.every((option) =>
        text(option, payload.customQuizKey ? 4096 : 1024)
      ) ||
      new Set(options.map((option) => he.decode(option).trim())).size !==
        options.length ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length ||
      !text(category, payload.customQuizKey ? 2048 : 160) ||
      !['0', 'easy', 'medium', 'hard', 'custom'].includes(level) ||
      (format === 'boolean' && options.length !== 2) ||
      (format === 'multiple' && options.length !== 4)
    )
      throw invalid();
    return {
      question,
      options: [...options],
      correct_answer: options[correctIndex],
      incorrect_answers: options.filter((_, index) => index !== correctIndex),
      category,
      difficulty: level,
      type: options.length === 2 ? 'boolean' : 'multiple',
    };
  });
  return {
    host: payload.host,
    title: payload.title,
    questions,
    correctAnswers,
    timeTaken,
    timeLimit,
    settings: {
      mode: payload.mode ?? 'exam',
      categoryId,
      difficulty,
      format,
      topic,
      customName: normalizeTestName(payload.title),
      ...(payload.customQuizKey
        ? {
            customQuizKey: payload.customQuizKey,
            maxAttempts: payload.maxAttempts ?? 0,
          }
        : {}),
    },
  };
};

export const createChallengeLink = async (questions, round, name, baseUrl) => {
  const payload = {
    v: 1,
    mode: round.mode ?? 'exam',
    host: playerName(name) || 'Your friend',
    title: normalizeTestName(round.customName) || round.topic,
    settings: [
      round.categoryId,
      round.difficulty,
      round.format,
      round.timeLimit,
      round.topic,
    ],
    ...(round.customQuizKey
      ? {
          customQuizKey: round.customQuizKey,
          maxAttempts: round.maxAttempts ?? 0,
        }
      : {}),
    score: [round.correctAnswers, round.timeTaken],
    questions: questions.map((item) => [
      item.question,
      item.options,
      item.options.indexOf(item.correct_answer),
      item.category || round.topic,
      item.difficulty || round.difficulty,
    ]),
  };
  validate(payload);
  return packQuizLink(payload, CHALLENGE_PREFIX, baseUrl);
};

export const openChallenge = async (token) => {
  try {
    return validate(await unpackQuizLink(token));
  } catch (error) {
    if (
      error.message === 'Open this quiz in an up-to-date browser to continue.'
    )
      throw error;
    throw invalid();
  }
};

export const challengeOutcome = (correctAnswers, challenge) =>
  correctAnswers > challenge.correctAnswers
    ? 'You won the challenge.'
    : correctAnswers < challenge.correctAnswers
    ? `${challenge.host} takes this round.`
    : 'It’s a draw.';
export const challengeTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};
