import React, { useEffect, useState } from 'react';
import Icon from '../Icon';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light'
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#1c211d' : '#f4f1e9');
  }, [theme]);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('quizapp.theme', next);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  };
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-pressed={theme === 'dark'}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
};
export default ThemeToggle;
