import he from 'he';
import { validQuizMode } from './quizMode';
import { validAttemptLimit } from './quizAttempts';
import { packQuizLink, unpackQuizLink } from './sharedQuizLink';

export const CUSTOM_QUIZ_PREFIX = '#custom=';
export const DRAFTS_KEY = 'quizapp.custom-quizzes.v1';
export const MAX_QUIZ_QUESTIONS = 50;
export const MAX_QUIZ_DRAFTS = 10;
export const MAX_QUIZ_COLLECTIONS = 20;
export const normalizeCollectionName = (value) =>
  value.trim().replace(/\s+/g, ' ').slice(0, 40);
const id = () =>
  window.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const validId = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
export const newCollectionId = id;
const bounded = (value, max) =>
  typeof value === 'string' && value.length <= max;
const line = (value) => value.trim().replace(/\s+/g, ' ');
export const newQuestion = () => ({
  id: id(),
  type: 'multiple',
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: null,
});
export const newQuizDraft = () => ({
  id: id(),
  revision: 1,
  title: '',
  author: '',
  description: '',
  timeLimit: 0,
  maxAttempts: 0,
  mode: 'exam',
  collectionId: '',
  questions: [newQuestion()],
});

const validDraft = (draft) =>
  draft &&
  validId(draft.id) &&
  Number.isInteger(draft.revision) &&
  draft.revision > 0 &&
  draft.revision < 1e9 &&
  validAttemptLimit(draft.maxAttempts) &&
  validQuizMode(draft.mode) &&
  bounded(draft.title, 60) &&
  bounded(draft.author, 40) &&
  bounded(draft.description, 240) &&
  Number.isInteger(draft.timeLimit) &&
  draft.timeLimit >= 0 &&
  draft.timeLimit <= 10800 &&
  Array.isArray(draft.questions) &&
  draft.questions.length > 0 &&
  draft.questions.length <= MAX_QUIZ_QUESTIONS &&
  new Set(draft.questions.map((q) => q?.id)).size === draft.questions.length &&
  draft.questions.every(
    (q) =>
      q &&
      validId(q.id) &&
      bounded(q.prompt, 1000) &&
      ['multiple', 'boolean'].includes(q.type) &&
      Array.isArray(q.options) &&
      q.options.length === (q.type === 'boolean' ? 2 : 4) &&
      q.options.every((a) => bounded(a, 200)) &&
      (q.correctIndex === null ||
        (Number.isInteger(q.correctIndex) &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length)) &&
      (q.type !== 'boolean' ||
        (q.options[0] === 'True' && q.options[1] === 'False'))
  );

export const draftErrors = (draft) => {
  const errors = [];
  if (!draft.title.trim())
    errors.push({ field: 'quiz-title', message: 'Give your quiz a title.' });
  draft.questions.forEach((q, index) => {
    const question = `Question ${index + 1}`;
    if (!q.prompt.trim())
      errors.push({
        field: `${q.id}-prompt`,
        message: `${question}: write a question.`,
      });
    q.options.forEach((option, i) => {
      if (!option.trim())
        errors.push({
          field: `${q.id}-answer-${i}`,
          message: `${question}: fill in answer ${String.fromCharCode(
            65 + i
          )}.`,
        });
    });
    const filled = q.options.map((option) => line(option).toLocaleLowerCase());
    if (filled.every(Boolean) && new Set(filled).size !== filled.length)
      errors.push({
        field: `${q.id}-answer-0`,
        message: `${question}: make each answer different.`,
      });
    if (q.correctIndex === null)
      errors.push({
        field: `${q.id}-correct-0`,
        message: `${question}: choose the correct answer.`,
      });
  });
  return errors;
};
export const loadQuizDrafts = () => {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw)
      return { drafts: [], collections: [], selectedId: null, available: true };
    if (raw.length > 2 * 1024 * 1024) throw new Error('Invalid drafts');
    const saved = JSON.parse(raw);
    if (saved?.v !== 1 || !Array.isArray(saved.drafts))
      throw new Error('Invalid drafts');
    const collections = Array.isArray(saved.collections)
      ? [
          ...new Map(
            saved.collections
              .filter(
                (c) =>
                  c && validId(c.id) && bounded(c.name, 40) && c.name.trim()
              )
              .slice(0, MAX_QUIZ_COLLECTIONS)
              .map((c) => [
                c.id,
                { id: c.id, name: normalizeCollectionName(c.name) },
              ])
          ).values(),
        ]
      : [];
    const drafts = saved.drafts
      .slice(0, MAX_QUIZ_DRAFTS)
      .filter(validDraft)
      .map((draft) => ({
        ...draft,
        maxAttempts: draft.maxAttempts ?? 0,
        mode: draft.mode ?? 'exam',
        collectionId: collections.some((c) => c.id === draft.collectionId)
          ? draft.collectionId
          : '',
      }));
    const unique = [...new Map(drafts.map((d) => [d.id, d])).values()];
    return {
      drafts: unique,
      collections,
      selectedId: unique.some((d) => d.id === saved.selectedId)
        ? saved.selectedId
        : unique[0]?.id,
      available: true,
    };
  } catch {
    return { drafts: [], collections: [], selectedId: null, available: false };
  }
};
export const saveQuizDrafts = (model) => {
  try {
    localStorage.setItem(
      DRAFTS_KEY,
      JSON.stringify({
        v: 1,
        drafts: model.drafts,
        collections: model.collections || [],
        selectedId: model.selectedId,
      })
    );
    return true;
  } catch {
    return false;
  }
};

const publish = (draft) => {
  if (!validDraft(draft) || draftErrors(draft).length)
    throw new Error(
      'Finish the quiz title, questions, answers, and correct-answer selections before playing or sharing.'
    );
  return {
    v: 1,
    id: draft.id,
    revision: draft.revision,
    title: line(draft.title),
    author: line(draft.author),
    description: draft.description.trim(),
    timeLimit: draft.timeLimit,
    maxAttempts: draft.maxAttempts ?? 0,
    mode: draft.mode ?? 'exam',
    questions: draft.questions.map((q) => [
      q.prompt.trim(),
      q.type,
      q.options.map((a) => a.trim()),
      q.correctIndex,
    ]),
  };
};
const playable = (payload) => {
  if (
    !payload ||
    payload.v !== 1 ||
    !Array.isArray(payload.questions) ||
    payload.questions.length > MAX_QUIZ_QUESTIONS
  )
    throw new Error('Invalid quiz');
  const draft = {
    ...payload,
    questions: payload.questions.map((entry, index) => {
      if (!Array.isArray(entry) || entry.length !== 4)
        throw new Error('Invalid question');
      return {
        id: `shared-${index}`,
        prompt: entry[0],
        type: entry[1],
        options: entry[2],
        correctIndex: entry[3],
      };
    }),
  };
  const clean = publish(draft);
  const formats = new Set(clean.questions.map((q) => q[1]));
  return {
    title: clean.title,
    author: clean.author,
    description: clean.description,
    timeLimit: clean.timeLimit,
    maxAttempts: clean.maxAttempts,
    settings: {
      topic: clean.title,
      categoryId: '0',
      difficulty: 'custom',
      format: formats.size > 1 ? '0' : clean.questions[0][1],
      customQuizKey: `${clean.id}.${clean.revision}`,
      maxAttempts: clean.maxAttempts,
      mode: clean.mode,
    },
    questions: clean.questions.map(([prompt, type, options, correctIndex]) => {
      const encoded = options.map((option) => he.encode(option));
      return {
        question: he.encode(prompt),
        type,
        options: encoded,
        correct_answer: encoded[correctIndex],
        incorrect_answers: encoded.filter((_, i) => i !== correctIndex),
        category: he.encode(clean.title),
        difficulty: 'custom',
      };
    }),
  };
};
export const playCustomQuiz = (draft) => playable(publish(draft));
export const createCustomQuizLink = (draft, baseUrl) =>
  packQuizLink(publish(draft), CUSTOM_QUIZ_PREFIX, baseUrl);
export const openCustomQuiz = async (token) => {
  try {
    return playable(await unpackQuizLink(token));
  } catch (error) {
    if (
      error.message === 'Open this quiz in an up-to-date browser to continue.'
    )
      throw error;
    throw new Error(
      'This quiz link is incomplete or invalid. Ask the creator to send a new link.'
    );
  }
};
