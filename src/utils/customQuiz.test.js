import he from 'he';
import { Blob as NativeBlob } from 'buffer';
import {
  CompressionStream as NativeCompressionStream,
  DecompressionStream as NativeDecompressionStream,
} from 'stream/web';
import {
  newQuizDraft,
  newQuestion,
  draftErrors,
  playCustomQuiz,
  createCustomQuizLink,
  openCustomQuiz,
  loadQuizDrafts,
  saveQuizDrafts,
  DRAFTS_KEY,
} from './customQuiz';
import { createChallengeLink, openChallenge } from './friendChallenge';
import { roundKey, findPersonalBest } from './quizHistory';
const makeDraft = () => ({
  ...newQuizDraft(),
  title: '世界 &copy; quiz',
  author: 'Vijay',
  description: 'A quiz\nfor friends',
  questions: [
    {
      ...newQuestion(),
      prompt: 'What does &copy; mean in <code>?',
      options: ['A & B', '©', '<b>Text</b>', '東京'],
      correctIndex: 2,
    },
  ],
});
const token = (payload) =>
  '1j.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
const original = {
  Blob: global.Blob,
  CompressionStream: global.CompressionStream,
  DecompressionStream: global.DecompressionStream,
};
beforeEach(() => localStorage.clear());
afterEach(() => {
  Object.assign(global, original);
  jest.restoreAllMocks();
});

test('keeps incomplete drafts while requiring complete, distinct answers before publication', () => {
  const draft = newQuizDraft();
  expect(draftErrors(draft)).toHaveLength(7);
  expect(() => playCustomQuiz(draft)).toThrow('Finish the quiz');
  saveQuizDrafts({ drafts: [draft], selectedId: draft.id });
  expect(loadQuizDrafts().drafts).toEqual([draft]);
  const valid = makeDraft();
  expect(draftErrors(valid)).toEqual([]);
  valid.questions[0].options[1] = ' A & B ';
  expect(
    draftErrors(valid).some((error) =>
      error.message.includes('make each answer different')
    )
  ).toBe(true);
});

test('plays authored text literally and keeps Unicode and HTML-like answer text intact', () => {
  const draft = makeDraft();
  const quiz = playCustomQuiz(draft);
  expect(he.decode(quiz.questions[0].question)).toBe(draft.questions[0].prompt);
  expect(quiz.questions[0].options.map((answer) => he.decode(answer))).toEqual(
    draft.questions[0].options
  );
  expect(he.decode(quiz.questions[0].correct_answer)).toBe('<b>Text</b>');
  expect(quiz.settings.customQuizKey).toBe(`${draft.id}.1`);
  expect(quiz.settings.difficulty).toBe('custom');
});

test('shares mixed-format timed quizzes as immutable, independently playable snapshots', async () => {
  global.CompressionStream = undefined;
  const draft = makeDraft();
  draft.timeLimit = 120;
  draft.maxAttempts = 3;
  draft.questions.push({
    ...newQuestion(),
    type: 'boolean',
    prompt: 'The answer is true?',
    options: ['True', 'False'],
    correctIndex: 0,
  });
  const link = await createCustomQuizLink(
    draft,
    'https://example.com/app/?tracking=one#builder'
  );
  expect(link).toMatch(/^https:\/\/example.com\/app\/#custom=1j\./);
  draft.title = 'Changed';
  draft.questions[0].options[2] = 'Edited';
  const shared = await openCustomQuiz(new URL(link).hash.slice(8));
  expect(shared.title).toBe('世界 &copy; quiz');
  expect(shared.timeLimit).toBe(120);
  expect(shared.settings.maxAttempts).toBe(3);
  expect(shared.settings.format).toBe('0');
  expect(he.decode(shared.questions[0].correct_answer)).toBe('<b>Text</b>');
});

test('uses the shared bounded compressed format and can challenge a friend after a custom quiz', async () => {
  Object.assign(global, {
    Blob: NativeBlob,
    CompressionStream: NativeCompressionStream,
    DecompressionStream: NativeDecompressionStream,
  });
  const draft = makeDraft();
  draft.maxAttempts = 2;
  draft.questions = Array.from({ length: 5 }, () => ({
    ...draft.questions[0],
    id: newQuestion().id,
  }));
  const link = await createCustomQuizLink(draft, 'https://example.com/');
  expect(link).toContain('#custom=1g.');
  const custom = await openCustomQuiz(new URL(link).hash.slice(8));
  const challengeLink = await createChallengeLink(
    custom.questions,
    {
      ...custom.settings,
      timeLimit: custom.timeLimit,
      correctAnswers: 3,
      timeTaken: 5000,
    },
    'Vijay',
    'https://example.com/'
  );
  const challenge = await openChallenge(new URL(challengeLink).hash.slice(11));
  expect(challenge.questions).toEqual(custom.questions);
  expect(challenge.settings.customQuizKey).toBe(custom.settings.customQuizKey);
  expect(challenge.settings.maxAttempts).toBe(2);
});

test('keeps old drafts and shared links unlimited and rejects invalid attempt policies', async () => {
  const draft = makeDraft();
  delete draft.maxAttempts;
  saveQuizDrafts({ drafts: [draft], selectedId: draft.id });
  expect(loadQuizDrafts().drafts[0].maxAttempts).toBe(0);
  expect(playCustomQuiz(draft).settings.maxAttempts).toBe(0);
  const payload = {
    v: 1,
    id: 'old',
    revision: 1,
    title: 'Old quiz',
    author: '',
    description: '',
    timeLimit: 0,
    questions: [['True?', 'boolean', ['True', 'False'], 0]],
  };
  expect((await openCustomQuiz(token(payload))).settings.maxAttempts).toBe(0);
  for (const maxAttempts of [-1, 11, 1.5, '2', null]) {
    await expect(
      openCustomQuiz(token({ ...payload, maxAttempts }))
    ).rejects.toThrow('incomplete or invalid');
  }
});

test.each([
  null,
  { v: 2 },
  {
    v: 1,
    id: 'bad id',
    revision: 1,
    title: 'Title',
    author: '',
    description: '',
    timeLimit: 0,
    questions: [],
  },
  {
    v: 1,
    id: 'valid',
    revision: 1,
    title: 'Title',
    author: '',
    description: '',
    timeLimit: 0,
    questions: [['Question', 'multiple', ['A', 'A', 'C', 'D'], 0]],
  },
  {
    v: 1,
    id: 'valid',
    revision: 1,
    title: 'Title',
    author: '',
    description: '',
    timeLimit: 0,
    questions: [['Question', 'boolean', ['Yes', 'No'], 0]],
  },
  {
    v: 1,
    id: 'valid',
    revision: 1,
    title: 'Title',
    author: '',
    description: '',
    timeLimit: 0,
    questions: [['Question', 'multiple', ['A', 'B', 'C', 'D'], 8]],
  },
])('rejects incomplete or invalid shared quiz data', async (payload) => {
  await expect(openCustomQuiz(token(payload))).rejects.toThrow(
    'incomplete or invalid'
  );
});

test('handles malformed stored drafts and denied storage without breaking the builder', () => {
  localStorage.setItem(DRAFTS_KEY, 'invalid');
  expect(loadQuizDrafts()).toMatchObject({ drafts: [], available: false });
  const draft = makeDraft();
  saveQuizDrafts({
    drafts: [draft, { ...draft, id: 'other', questions: [] }],
    selectedId: 'missing',
  });
  expect(loadQuizDrafts()).toMatchObject({
    drafts: [draft],
    selectedId: draft.id,
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  expect(saveQuizDrafts({ drafts: [draft], selectedId: draft.id })).toBe(false);
});

test('compares only the same custom quiz revision and separates it from normal trivia', () => {
  const draft = makeDraft();
  const settings = playCustomQuiz(draft).settings;
  const base = {
    ...settings,
    totalQuestions: 1,
    timeLimit: 0,
    correctAnswers: 1,
    timeTaken: 1000,
  };
  expect(roundKey({ ...base, customQuizKey: undefined })).not.toBe(
    roundKey(base)
  );
  expect(
    findPersonalBest([{ ...base, customQuizKey: `${draft.id}.2` }], base)
  ).toBeNull();
  expect(
    findPersonalBest([{ ...base, customQuizKey: 'another.1' }], base)
  ).toBeNull();
  expect(findPersonalBest([base], { ...base, topic: 'Renamed' })).toEqual(base);
});

test('persists collections, repairs dangling memberships and keeps organisation out of shared snapshots', async () => {
  const draft = { ...makeDraft(), collectionId: 'science', mode: 'practice' };
  saveQuizDrafts({
    drafts: [draft],
    selectedId: draft.id,
    collections: [{ id: 'science', name: 'Science' }],
  });
  expect(loadQuizDrafts()).toMatchObject({
    drafts: [draft],
    collections: [{ id: 'science', name: 'Science' }],
  });
  const link = await createCustomQuizLink(draft, 'https://example.com/');
  const shared = await openCustomQuiz(new URL(link).hash.slice(8));
  expect(shared.settings.mode).toBe('practice');
  expect(shared.collectionId).toBeUndefined();
  const challengeLink = await createChallengeLink(
    shared.questions,
    { ...shared.settings, timeLimit: 0, correctAnswers: 1, timeTaken: 1000 },
    '',
    'https://example.com/'
  );
  expect(
    (await openChallenge(new URL(challengeLink).hash.slice(11))).settings.mode
  ).toBe('practice');
  saveQuizDrafts({ drafts: [draft], selectedId: draft.id, collections: [] });
  expect(loadQuizDrafts().drafts[0].collectionId).toBe('');
  expect(roundKey({ ...shared.settings, mode: 'exam' })).not.toBe(
    roundKey(shared.settings)
  );
});

test('older quizzes default to exam mode and unsupported modes are rejected', async () => {
  const draft = makeDraft();
  delete draft.mode;
  delete draft.collectionId;
  saveQuizDrafts({ drafts: [draft], selectedId: draft.id });
  expect(loadQuizDrafts().drafts[0]).toMatchObject({
    mode: 'exam',
    collectionId: '',
  });
  expect(playCustomQuiz(draft).settings.mode).toBe('exam');
  expect(() => playCustomQuiz({ ...draft, mode: 'unknown' })).toThrow();
});
