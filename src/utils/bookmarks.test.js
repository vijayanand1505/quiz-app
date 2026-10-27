import he from 'he';
import {
  BOOKMARKS_KEY,
  makeBookmark,
  bookmarkKey,
  loadBookmarks,
  saveBookmarks,
  questionsFromBookmarks,
} from './bookmarks';
const question = {
  question: 'What is &amp;copy; in &lt;code&gt;?',
  options: ['&amp;copy;', '&lt;b&gt;Text&lt;/b&gt;'],
  correct_answer: '&amp;copy;',
  category: 'Code &amp; text',
  difficulty: 'custom',
};
beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());
test('saves literal text, deduplicates shuffled answers, and safely rebuilds practice questions', () => {
  const item = makeBookmark(question);
  expect(item.question).toBe('What is &copy; in <code>?');
  expect(item.correct_answer).toBe('&copy;');
  expect(
    bookmarkKey({ ...question, options: [...question.options].reverse() })
  ).toBe(item.id);
  saveBookmarks([item, item]);
  expect(loadBookmarks().items).toEqual([item]);
  const practice = questionsFromBookmarks([item])[0];
  expect(he.decode(practice.correct_answer)).toBe('&copy;');
  expect(he.decode(practice.question)).toBe(item.question);
  expect(practice.options.map(he.decode)).toEqual(item.options);
});
test('ignores invalid stored questions and recovers from unreadable storage', () => {
  const item = makeBookmark(question);
  saveBookmarks([
    item,
    { ...item, id: 'forged' },
    { ...item, correct_answer: 'Missing answer' },
  ]);
  expect(loadBookmarks().items).toEqual([item]);
  localStorage.setItem(BOOKMARKS_KEY, 'bad data');
  expect(loadBookmarks()).toEqual({ items: [], available: false });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  expect(saveBookmarks([item])).toBe(false);
});
