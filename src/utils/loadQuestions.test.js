import { loadQuestions, QUESTION_TIMEOUT } from './loadQuestions';

const question = {
  question: 'Which &amp; why?',
  correct_answer: 'Alpha',
  incorrect_answers: ['Beta', 'Gamma', 'Delta'],
};
const params = new URLSearchParams({ amount: 1 });
const response = (payload) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('builds a complete playable quiz and passes the abort signal to fetch', async () => {
  fetch.mockResolvedValue(response({ response_code: 0, results: [question] }));
  const [loaded] = await loadQuestions(params);
  expect(loaded.question).toBe(question.question);
  expect([...loaded.options].sort()).toEqual([
    'Alpha',
    'Beta',
    'Delta',
    'Gamma',
  ]);
  expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});

test.each([
  [response({ response_code: 1 }), 'There aren’t enough questions', 0],
  [response({ response_code: 5 }), 'Please wait', 5],
  [{ ok: false, status: 429 }, 'service is busy', 5],
  [{ ok: false, status: 503 }, 'service is unavailable', 0],
  [response({ response_code: 0, results: [] }), 'incomplete quiz', 0],
  [
    response({
      response_code: 0,
      results: [{ ...question, incorrect_answers: [null] }],
    }),
    'incomplete quiz',
    0,
  ],
  [
    response({
      response_code: 0,
      results: [
        {
          ...question,
          correct_answer: 'A &amp; B',
          incorrect_answers: ['A & B'],
        },
      ],
    }),
    'incomplete quiz',
    0,
  ],
  [
    response({ response_code: 0, results: [{ ...question, category: {} }] }),
    'incomplete quiz',
    0,
  ],
  [response(null), 'incomplete quiz', 0],
])(
  'rejects unavailable or malformed quizzes with an actionable message',
  async (reply, message, retryAfter) => {
    fetch.mockResolvedValue(reply);
    await expect(loadQuestions(params)).rejects.toMatchObject({
      message: expect.stringContaining(message),
      retryAfter,
    });
  }
);

test('aborts a stalled request and allows a later request to succeed', async () => {
  jest.useFakeTimers();
  fetch.mockImplementationOnce(
    (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      })
  );
  const failed = expect(loadQuestions(params)).rejects.toThrow(
    'Loading took too long'
  );
  jest.advanceTimersByTime(QUESTION_TIMEOUT);
  await failed;
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  fetch.mockResolvedValue(response({ response_code: 0, results: [question] }));
  await expect(loadQuestions(params)).resolves.toHaveLength(1);
});

test('cancels a request when its caller unmounts', async () => {
  const controller = new AbortController();
  fetch.mockImplementation(
    (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      })
  );
  const result = expect(
    loadQuestions(params, controller.signal)
  ).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await result;
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
});

test('handles an unreadable response without exposing a parser error', async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
  });
  await expect(loadQuestions(params)).rejects.toThrow('unreadable quiz');
});
