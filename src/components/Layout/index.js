import React from 'react';
import PropTypes from 'prop-types';
import Header from '../Header';

const Layout = ({ children, activeArea, quizLabel, quizHref }) => (
  <>
    <a
      className="skip-link"
      href="#main-content"
      onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById('main-content');
        main?.focus({ preventScroll: true });
        main?.scrollIntoView({ block: 'start' });
      }}
    >
      Skip to main content
    </a>
    <Header activeArea={activeArea} quizLabel={quizLabel} quizHref={quizHref} />
    <main id="main-content" className="app-main" tabIndex={-1}>
      {children}
    </main>
    <footer className="site-footer">
      <span>
        QuizApp <span className="footer-dot">/</span> A project by{' '}
        <a
          href="https://github.com/vijayanand1505"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vijay Anand
        </a>
      </span>
      <span>
        Trivia questions from{' '}
        <a href="https://opentdb.com" target="_blank" rel="noreferrer">
          Open Trivia Database ↗
        </a>
      </span>
    </footer>
  </>
);
Layout.propTypes = {
  children: PropTypes.node,
  activeArea: PropTypes.string,
  quizLabel: PropTypes.string,
  quizHref: PropTypes.string,
};
export default Layout;
