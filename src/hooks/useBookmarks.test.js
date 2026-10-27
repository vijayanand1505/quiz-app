import { act, renderHook } from '@testing-library/react';
import useBookmarks from './useBookmarks';
import {
  BOOKMARKS_KEY,
  makeBookmark,
  saveBookmarks,
  MAX_BOOKMARKS,
} from '../utils/bookmarks';
const question = {
  question: 'Saved question?',
  options: ['Alpha', 'Beta'],
  correct_answer: 'Alpha',
};
beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());
test('toggles bookmarks, keeps changes during denied storage, and responds to another tab', () => {
  const { result } = renderHook(useBookmarks);
  act(() => result.current.toggle(question));
  expect(result.current.items).toHaveLength(1);
  act(() => result.current.toggle({ ...question, options: ['Beta', 'Alpha'] }));
  expect(result.current.items).toHaveLength(0);
  saveBookmarks([makeBookmark(question)]);
  act(() =>
    window.dispatchEvent(new StorageEvent('storage', { key: BOOKMARKS_KEY }))
  );
  expect(result.current.items).toHaveLength(1);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Full');
  });
  act(() => result.current.toggle(question));
  expect(result.current.items).toHaveLength(0);
  expect(result.current.available).toBe(false);
  act(() => result.current.toggle(question));
  expect(result.current.items).toHaveLength(1);
});
test('enforces the library size without dropping previously saved questions', () => {
  saveBookmarks(
    Array.from({ length: MAX_BOOKMARKS }, (_, i) =>
      makeBookmark({ ...question, question: `Question ${i}?` })
    )
  );
  const { result } = renderHook(useBookmarks);
  act(() => result.current.toggle(question));
  expect(result.current.items).toHaveLength(MAX_BOOKMARKS);
  expect(result.current.message).toMatch(/up to 200/);
});
