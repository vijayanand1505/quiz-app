import { Blob as NativeBlob } from 'buffer';
import {
  CompressionStream as NativeCompressionStream,
  DecompressionStream as NativeDecompressionStream,
} from 'stream/web';
import { gzipSync } from 'zlib';
import {
  createChallengeLink,
  openChallenge,
  playerName,
  challengeOutcome,
  MAX_CHALLENGE_BYTES,
  MAX_CHALLENGE_LINK_LENGTH,
} from './friendChallenge';

const question = {
  question: 'Which café serves tea &amp; coffee?',
  options: ['Paris', 'Zürich', '東京', 'São Paulo'],
  correct_answer: '東京',
  category: 'Geography',
  difficulty: 'easy',
};
const round = {
  categoryId: '22',
  difficulty: 'easy',
  format: 'multiple',
  topic: 'Geography',
  timeLimit: 120,
  correctAnswers: 1,
  timeTaken: 10000,
  customName: '世界 quiz ☕',
};
const payload = {
  v: 1,
  host: 'Vijay',
  title: 'A quiz',
  settings: ['22', 'easy', 'multiple', 120, 'Geography'],
  score: [1, 10000],
  questions: [[question.question, question.options, 2, 'Geography', 'easy']],
};
const token = (value) =>
  `1j.${Buffer.from(JSON.stringify(value)).toString('base64url')}`;
const original = {
  Blob: global.Blob,
  CompressionStream: global.CompressionStream,
  DecompressionStream: global.DecompressionStream,
};
afterEach(() => Object.assign(global, original));

test('round trips exact questions, choices, correct answers, settings, Unicode and the host score', async () => {
  global.CompressionStream = undefined;
  const questions = [question];
  const link = await createChallengeLink(
    questions,
    round,
    '  Vijay   Anand  ',
    'https://example.com/quiz/?tracking=one#record'
  );
  expect(link).toMatch(/^https:\/\/example.com\/quiz\/#challenge=1j\./);
  const decoded = await openChallenge(
    new URL(link).hash.slice('#challenge='.length)
  );
  expect(decoded).toMatchObject({
    host: 'Vijay Anand',
    title: round.customName,
    correctAnswers: 1,
    timeTaken: 10000,
    timeLimit: 120,
    settings: {
      categoryId: '22',
      difficulty: 'easy',
      format: 'multiple',
      topic: 'Geography',
    },
  });
  expect(decoded.questions[0]).toMatchObject(question);
  expect(questions[0].options).toEqual([
    'Paris',
    'Zürich',
    '東京',
    'São Paulo',
  ]);
});

test('supports mixed answer formats, unnamed hosts and untimed rounds', async () => {
  const boolean = {
    ...question,
    question: 'True?',
    options: ['False', 'True'],
    correct_answer: 'True',
  };
  const link = await createChallengeLink(
    [question, boolean],
    { ...round, timeLimit: 0, format: '0' },
    ' ',
    'https://example.com'
  );
  const decoded = await openChallenge(new URL(link).hash.slice(11));
  expect(decoded.host).toBe('Your friend');
  expect(decoded.timeLimit).toBe(0);
  expect(decoded.questions.map((q) => q.type)).toEqual(['multiple', 'boolean']);
});

test.each([
  null,
  { ...payload, v: 2 },
  { ...payload, mode: 'unknown' },
  { ...payload, host: {} },
  { ...payload, score: [2, 10000] },
  { ...payload, score: [1, -1] },
  { ...payload, score: [1, 120001] },
  { ...payload, settings: ['22', 'easy', 'multiple', -1, 'Geography'] },
  { ...payload, settings: ['22', 'easy', 'boolean', 120, 'Geography'] },
  { ...payload, questions: [] },
  {
    ...payload,
    questions: [[question.question, question.options, 7, 'Geography', 'easy']],
  },
  {
    ...payload,
    questions: [
      [
        question.question,
        ['A &amp; B', 'A & B', 'C', 'D'],
        0,
        'Geography',
        'easy',
      ],
    ],
  },
  {
    ...payload,
    questions: [
      [question.question, [null, 'B', 'C', 'D'], 0, 'Geography', 'easy'],
    ],
  },
])('rejects invalid shared data before it can enter a quiz', async (value) => {
  await expect(openChallenge(token(value))).rejects.toThrow(
    'incomplete or invalid'
  );
});

test.each([
  '',
  '2j.abc',
  '1g.!',
  '1j.not-valid-json',
  `1j.${'a'.repeat(MAX_CHALLENGE_LINK_LENGTH)}`,
])('handles broken or unsupported links', async (value) => {
  await expect(openChallenge(value)).rejects.toThrow('incomplete or invalid');
});

test('uses bounded gzip compression when available', async () => {
  Object.assign(global, {
    Blob: NativeBlob,
    CompressionStream: NativeCompressionStream,
    DecompressionStream: NativeDecompressionStream,
  });
  const link = await createChallengeLink(
    Array.from({ length: 10 }, () => question),
    { ...round, correctAnswers: 8 },
    'Vijay',
    'https://example.com/'
  );
  expect(link).toContain('#challenge=1g.');
  const decoded = await openChallenge(new URL(link).hash.slice(11));
  expect(decoded.questions).toHaveLength(10);
  expect(decoded.correctAnswers).toBe(8);
  expect(decoded.questions[0]).toMatchObject(question);
  const bomb = `1g.${gzipSync(
    Buffer.from('a'.repeat(MAX_CHALLENGE_BYTES + 1))
  ).toString('base64url')}`;
  await expect(openChallenge(bomb)).rejects.toThrow('incomplete or invalid');
});

test('gives a usable error if compressed links are opened without browser support', async () => {
  global.DecompressionStream = undefined;
  const packed = `1g.${gzipSync(Buffer.from(JSON.stringify(payload))).toString(
    'base64url'
  )}`;
  await expect(openChallenge(packed)).rejects.toThrow('up-to-date browser');
});

test('rejects links that would be too large to send', async () => {
  global.CompressionStream = undefined;
  const large = { ...question, question: 'x'.repeat(4000) };
  await expect(
    createChallengeLink(
      Array.from({ length: 4 }, () => large),
      round,
      'Vijay',
      'https://example.com/'
    )
  ).rejects.toThrow('too large to share');
  await expect(
    createChallengeLink(
      Array.from({ length: 50 }, () => large),
      round,
      'Vijay',
      'https://example.com/'
    )
  ).rejects.toThrow('too large to share');
});

test('normalizes names and treats equal correct-answer counts as draws regardless of speed', () => {
  expect(playerName('  Vijay   Anand  ')).toBe('Vijay Anand');
  expect(playerName('x'.repeat(100))).toHaveLength(40);
  expect(
    challengeOutcome(1, { host: 'Vijay', correctAnswers: 1, timeTaken: 1000 })
  ).toBe('It’s a draw.');
  expect(challengeOutcome(2, { host: 'Vijay', correctAnswers: 1 })).toBe(
    'You won the challenge.'
  );
  expect(challengeOutcome(0, { host: 'Vijay', correctAnswers: 1 })).toBe(
    'Vijay takes this round.'
  );
});
