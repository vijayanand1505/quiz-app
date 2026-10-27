import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../Icon';
import { hasBookmark } from '../../utils/bookmarks';
const BookmarkButton = ({ question, bookmarks = [], onToggle }) => {
  if (!question || !onToggle) return null;
  const saved = hasBookmark(bookmarks, question);
  return (
    <button
      type="button"
      className="bookmark-button"
      aria-pressed={saved}
      onClick={() => onToggle(question)}
    >
      <Icon name="bookmark" size={17} />
      {saved ? 'Question saved' : 'Save question'}
    </button>
  );
};
BookmarkButton.propTypes = {
  question: PropTypes.object,
  bookmarks: PropTypes.array,
  onToggle: PropTypes.func,
};
export default BookmarkButton;
