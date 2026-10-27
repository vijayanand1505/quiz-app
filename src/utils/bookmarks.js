import he from 'he';
export const BOOKMARKS_KEY = 'quizapp.bookmarks.v1';
export const MAX_BOOKMARKS = 200;
const bounded = (value, max) =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const validQuestion = (q) =>
  q &&
  bounded(q.question, 16384) &&
  Array.isArray(q.options) &&
  [2, 4].includes(q.options.length) &&
  q.options.every((o) => bounded(o, 4096)) &&
  new Set(q.options).size === q.options.length &&
  bounded(q.correct_answer, 4096) &&
  q.options.includes(q.correct_answer) &&
  bounded(q.category, 2048) &&
  bounded(q.difficulty, 20);
const literalQuestion = (question) => ({
  question: he.decode(question.question),
  options: question.options.map((option) => he.decode(option)),
  correct_answer: he.decode(question.correct_answer),
  category: he.decode(question.category || 'Trivia'),
  difficulty: question.difficulty || '0',
});
// Sorting options means shuffling or replaying does not create duplicate saves.
const identity = (q) =>
  JSON.stringify([q.question, [...q.options].sort(), q.correct_answer]);
export const bookmarkKey = (question) => identity(literalQuestion(question));
export const hasBookmark = (bookmarks, question) =>
  bookmarks.some((item) => item.id === bookmarkKey(question));
export const makeBookmark = (question) => {
  const clean = literalQuestion(question);
  if (!validQuestion(clean)) throw new Error('This question cannot be saved.');
  return { ...clean, id: identity(clean), savedAt: new Date().toISOString() };
};
export const loadBookmarks = () => {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return { items: [], available: true };
    if (raw.length > 8 * 1024 * 1024) throw new Error('Invalid bookmarks');
    const data = JSON.parse(raw);
    if (data?.v !== 1 || !Array.isArray(data.items))
      throw new Error('Invalid bookmarks');
    const items = data.items
      .slice(0, MAX_BOOKMARKS)
      .filter(
        (q) =>
          validQuestion(q) &&
          q.id === identity(q) &&
          Number.isFinite(Date.parse(q.savedAt))
      );
    return {
      items: [...new Map(items.map((item) => [item.id, item])).values()],
      available: true,
    };
  } catch {
    return { items: [], available: false };
  }
};
export const saveBookmarks = (items) => {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify({ v: 1, items }));
    return true;
  } catch {
    return false;
  }
};
export const questionsFromBookmarks = (items) =>
  items.slice(0, 50).map((item) => ({
    question: he.encode(item.question),
    options: item.options.map((option) => he.encode(option)),
    correct_answer: he.encode(item.correct_answer),
    category: he.encode(item.category),
    difficulty: item.difficulty,
    type: item.options.length === 2 ? 'boolean' : 'multiple',
  }));
