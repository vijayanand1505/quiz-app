/**
 * Capture the real application in an isolated browser using illustrative data.
 * See docs/README.md for setup. This script does not publish or modify app code.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const he = require('he');
const output = path.resolve(__dirname, '../images');
const origin = process.env.QUIZ_SCREENSHOT_URL || 'http://localhost:3000';
const desktop = { width: 1280, height: 1000 };
const facts = [
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correct: 'Mars',
    category: 'Science: Astronomy',
  },
  {
    question: 'Which part of a plant absorbs most of its water?',
    options: ['Leaves', 'Flowers', 'Roots', 'Stems'],
    correct: 'Roots',
    category: 'Science: Nature',
  },
  {
    question: 'A triangle has three sides.',
    options: ['True', 'False'],
    correct: 'True',
    category: 'Mathematics',
  },
  {
    question: 'What does HTML primarily describe?',
    options: [
      'The structure of a web page',
      'The speed of an internet connection',
      'The colour of a computer screen',
      'The size of a database',
    ],
    correct: 'The structure of a web page',
    category: 'Science: Computers',
  },
  {
    question: 'Which unit measures electrical resistance?',
    options: ['Watt', 'Volt', 'Ohm', 'Ampere'],
    correct: 'Ohm',
    category: 'Science: Physics',
  },
];
const rawQuestion = (q) => ({
  question: he.encode(q.question),
  type: q.options.length === 2 ? 'boolean' : 'multiple',
  correct_answer: he.encode(q.correct),
  incorrect_answers: q.options
    .filter((a) => a !== q.correct)
    .map((a) => he.encode(a)),
  category: he.encode(q.category),
  difficulty: 'easy',
});
const draft = (id, title, collectionId, mode, questions) => ({
  id,
  revision: 1,
  title,
  author: 'Vijay Anand',
  description: 'A few familiar questions. A few things worth remembering.',
  timeLimit: 300,
  maxAttempts: 2,
  collectionId,
  mode,
  questions: questions.map((q, i) => ({
    id: `${id}-q${i}`,
    prompt: q.question,
    type: q.options.length === 2 ? 'boolean' : 'multiple',
    options: q.options,
    correctIndex: q.options.indexOf(q.correct),
  })),
});
const science = draft(
  'docs-science',
  'Everyday science',
  'science',
  'exam',
  facts.slice(0, 3)
);
const customPayload = (quiz) => ({
  v: 1,
  id: quiz.id,
  revision: quiz.revision,
  title: quiz.title,
  author: quiz.author,
  description: quiz.description,
  timeLimit: quiz.timeLimit,
  maxAttempts: quiz.maxAttempts,
  mode: quiz.mode,
  questions: quiz.questions.map((q) => [
    q.prompt,
    q.type,
    q.options,
    q.correctIndex,
  ]),
});
const customUrl = (quiz) =>
  `${origin}/#custom=1j.${Buffer.from(
    JSON.stringify(customPayload(quiz))
  ).toString('base64url')}`;
const bookmark = (q) => ({
  question: q.question,
  options: q.options,
  correct_answer: q.correct,
  category: q.category,
  difficulty: 'easy',
  id: JSON.stringify([q.question, [...q.options].sort(), q.correct]),
  savedAt: '2026-10-27T09:00:00.000Z',
});
const round = (i, correct) => ({
  id: `docs-round-${i}`,
  topic: 'Mixed topics',
  categoryId: '0',
  difficulty: 'easy',
  format: '0',
  mode: 'exam',
  totalQuestions: 5,
  correctAnswers: correct,
  timeLimit: 120,
  timeTaken: 65000 + i * 3500,
  testNumber: i,
  completedAt: `2026-10-${String(19 + i).padStart(2, '0')}T09:00:00.000Z`,
  ...(i === 8 ? { customName: 'The morning warm-up' } : {}),
});
const mainNav = (page, name) =>
  page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name, exact: true });
const capture = async (page, name, locator) => {
  await page.evaluate(() => document.fonts.ready);
  const settings = {
    path: path.join(output, name),
    animations: 'disabled',
    caret: 'hide',
  };
  if (locator) await locator.screenshot(settings);
  else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ ...settings, fullPage: true });
  }
  console.log(`Captured ${name}`);
};
async function run() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
      : { channel: 'chrome' }),
  });
  const errors = [];
  const contexts = [];
  const newPage = async () => {
    const context = await browser.newContext({
      viewport: desktop,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'en-US',
      timezoneId: 'Asia/Kolkata',
    });
    contexts.push(context);
    await context.route('https://opentdb.com/api.php*', async (route) => {
      const amount = Number(
        new URL(route.request().url()).searchParams.get('amount')
      );
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          response_code: 0,
          results: Array.from({ length: amount }, (_, i) =>
            rawQuestion(facts[i % facts.length])
          ),
        }),
      });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    return page;
  };
  try {
    const page = await newPage();
    await page.goto(`${origin}/`);
    await page.getByRole('heading', { name: /Know a little/ }).waitFor();
    await capture(page, 'quiz-setup.png');
    await page
      .getByRole('button', { name: 'Start the quiz', exact: true })
      .click();
    await page
      .getByRole('heading', { name: facts[0].question, exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Save question', exact: true })
      .click();
    await page.getByRole('button', { name: 'Mars', exact: true }).click();
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
    await page.getByRole('button', { name: 'Stems', exact: true }).click();
    await capture(page, 'question-navigator.png');
    await page
      .getByRole('button', { name: 'Next question', exact: true })
      .click();
    for (let i = 2; i < facts.length; i++) {
      await page
        .getByRole('heading', { name: facts[i].question, exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: facts[i].correct, exact: true })
        .click();
      await page
        .getByRole('button', {
          name: i === facts.length - 1 ? 'Finish round' : 'Next question',
          exact: true,
        })
        .click();
    }
    await page
      .getByRole('button', { name: 'Play again', exact: true })
      .waitFor();
    await page.getByRole('button', { name: /Rename Mixed topics/ }).click();
    await page
      .getByRole('textbox', { name: 'Test name', exact: true })
      .fill('The lunch-break round');
    await page.getByRole('button', { name: 'Save name', exact: true }).click();
    await capture(page, 'score-and-results.png');
    await page
      .getByRole('button', { name: 'Share score', exact: true })
      .click();
    const share = page.getByRole('dialog', {
      name: 'Share your round',
      exact: true,
    });
    await share
      .getByRole('link', { name: 'Download image', exact: true })
      .waitFor();
    await capture(page, 'share-score.png', share);
    await page
      .getByRole('button', { name: 'Close share dialog', exact: true })
      .click();
    await page
      .getByRole('tab', { name: 'Review answers', exact: true })
      .click();
    await page.getByRole('button', { name: /Incorrect\s*1/ }).click();
    await capture(page, 'answer-review.png');
    await page.getByRole('tab', { name: 'Scorecard', exact: true }).click();
    await page
      .getByRole('button', { name: 'Challenge a friend', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Challenge a friend',
      exact: true,
    });
    await dialog.getByRole('textbox', { name: /Your name/ }).fill('Vijay');
    await dialog
      .getByRole('button', { name: 'Create challenge link', exact: true })
      .click();
    const challengeLink = await dialog
      .getByRole('textbox', { name: 'Challenge link', exact: true })
      .inputValue();
    const guest = await newPage();
    await guest.goto(challengeLink);
    await guest
      .getByRole('heading', { name: 'Vijay challenged you.', exact: true })
      .waitFor();
    await capture(guest, 'friend-challenge.png');
    await guest
      .getByRole('button', { name: 'Accept challenge', exact: true })
      .click();
    await guest
      .getByRole('heading', { name: facts[0].question, exact: true })
      .waitFor();
    for (let i = 0; i < facts.length; i++) {
      await guest
        .getByRole('button', { name: facts[i].correct, exact: true })
        .click();
      await guest
        .getByRole('button', {
          name: i === facts.length - 1 ? 'Finish round' : 'Next question',
          exact: true,
        })
        .click();
    }
    await guest
      .getByRole('heading', { name: 'You won the challenge.', exact: true })
      .waitFor();
    await capture(
      guest,
      'challenge-comparison.png',
      guest.locator('.challenge-comparison')
    );

    const practice = await newPage();
    await practice.goto(`${origin}/`);
    await practice.getByRole('radio', { name: /Practice mode/ }).check();
    await practice.getByLabel('No time limit', { exact: true }).check();
    await practice
      .getByRole('button', { name: 'Start the quiz', exact: true })
      .click();
    await practice
      .getByRole('heading', { name: facts[0].question, exact: true })
      .waitFor();
    await practice.getByRole('button', { name: 'Venus', exact: true }).click();
    await capture(
      practice,
      'practice-mode.png',
      practice.locator('.question-card')
    );
    await practice
      .getByRole('button', { name: 'Switch to dark theme', exact: true })
      .click();
    await practice.setViewportSize({ width: 390, height: 844 });
    await capture(practice, 'mobile-dark.png');

    const library = await newPage();
    await library.goto(`${origin}/`);
    const rounds = [2, 3, 2, 4, 3, 4, 4, 5].map((correct, i) =>
      round(i + 1, correct)
    );
    const drafts = [
      science,
      draft('docs-web', 'Web basics', 'web', 'practice', [facts[3], facts[2]]),
      draft('docs-weekend', 'Weekend warm-up', '', 'exam', facts),
    ];
    await library.evaluate(
      ({ rounds, drafts, bookmarks }) => {
        localStorage.setItem(
          'quizapp.custom-quizzes.v1',
          JSON.stringify({
            v: 1,
            drafts,
            selectedId: 'docs-science',
            collections: [
              { id: 'science', name: 'Science & discovery' },
              { id: 'web', name: 'Learning the web' },
            ],
          })
        );
        localStorage.setItem(
          'quizapp.rounds.v1',
          JSON.stringify({
            rounds: [...rounds].reverse(),
            bests: [rounds[7]],
            lastTestNumber: 8,
          })
        );
        localStorage.setItem(
          'quizapp.bookmarks.v1',
          JSON.stringify({ v: 1, items: bookmarks })
        );
      },
      {
        rounds,
        drafts,
        bookmarks: [facts[0], facts[1], facts[3]].map(bookmark),
      }
    );
    await library.goto(`${origin}/#record`);
    await library.reload();
    await library
      .getByRole('heading', { name: 'Recent rounds', exact: true })
      .waitFor();
    await capture(library, 'recent-rounds.png');
    await library
      .getByRole('navigation', { name: 'Record navigation' })
      .getByRole('link', { name: 'Progress', exact: true })
      .click();
    await library
      .getByRole('heading', { name: 'Progress over time', exact: true })
      .waitFor();
    await capture(library, 'progress-over-time.png');
    await mainNav(library, 'Saved').click();
    await library
      .getByRole('heading', { name: 'Saved questions', exact: true })
      .waitFor();
    await capture(library, 'saved-questions.png');
    await mainNav(library, 'Create quiz').click();
    await library.getByLabel('Quiz title', { exact: true }).waitFor();
    await capture(
      library,
      'quiz-builder.png',
      library.getByRole('region', { name: 'Question 1', exact: true })
    );
    await capture(
      library,
      'quiz-settings.png',
      library.locator('.builder-details')
    );
    await library
      .getByRole('navigation', { name: 'Quiz builder navigation' })
      .getByRole('link', { name: /Collections/ })
      .click();
    await library
      .getByRole('heading', { name: 'Quiz collections', exact: true })
      .waitFor();
    await capture(library, 'quiz-collections.png');

    const invite = await newPage();
    await invite.goto(customUrl(science));
    await invite
      .getByRole('heading', { name: 'Everyday science', exact: true })
      .waitFor();
    await capture(invite, 'custom-quiz-invitation.png');
    assert.equal(
      await invite
        .getByRole('button', { name: 'Start this quiz', exact: true })
        .isEnabled(),
      true
    );
    assert.deepEqual(
      errors,
      [],
      'Screenshots must come from a working application'
    );
    console.log('All documentation screenshots captured successfully.');
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
