import { useEffect, useRef, useState } from 'react';
import {
  BOOKMARKS_KEY,
  MAX_BOOKMARKS,
  loadBookmarks,
  saveBookmarks,
  makeBookmark,
  bookmarkKey,
} from '../utils/bookmarks';
const useBookmarks = () => {
  const [state, setState] = useState(loadBookmarks);
  const current = useRef(state);
  const [message, setMessage] = useState('');
  const apply = (items, notice) => {
    const next = { items, available: saveBookmarks(items) };
    current.current = next;
    setState(next);
    setMessage(notice);
  };
  useEffect(() => {
    const update = (event) => {
      if (event.key !== BOOKMARKS_KEY && event.key !== null) return;
      const next = loadBookmarks();
      current.current = next;
      setState(next);
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  const add = (item) => {
    if (current.current.items.some((q) => q.id === item.id)) return;
    if (current.current.items.length >= MAX_BOOKMARKS) {
      setMessage(
        `You can save up to ${MAX_BOOKMARKS} questions. Remove one to make room.`
      );
      return;
    }
    apply(
      [item, ...current.current.items],
      'Question saved. Find it in Saved questions.'
    );
  };
  const remove = (id) =>
    apply(
      current.current.items.filter((q) => q.id !== id),
      'Question removed from saved questions.'
    );
  const toggle = (question) => {
    try {
      const id = bookmarkKey(question);
      if (current.current.items.some((q) => q.id === id)) remove(id);
      else add(makeBookmark(question));
    } catch (error) {
      setMessage(error.message);
    }
  };
  return { ...state, message, toggle, remove, restore: add };
};
export default useBookmarks;
