import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import ThemeToggle from '../ThemeToggle';
import PropTypes from 'prop-types';

const Header = ({ activeArea = 'quiz', quizLabel = 'Take a quiz' }) => {
  const [promptEvent, setPromptEvent] = useState(null);
  const [appAccepted, setAppAccepted] = useState(false);
  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () =>
      window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);
  const installApp = async () => {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setAppAccepted(outcome === 'accepted');
    setPromptEvent(null);
  };
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches || appAccepted;
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand" aria-label="QuizApp">
          QuizApp<span className="brand-period">.</span>
        </div>
        <nav className="site-navigation" aria-label="Main navigation">
          <a
            href="#quiz"
            aria-current={activeArea === 'quiz' ? 'page' : undefined}
          >
            {quizLabel}
          </a>
          <a
            href="#record"
            aria-current={activeArea === 'record' ? 'page' : undefined}
          >
            My record
          </a>
        </nav>
        <div className="header-right">
          <ThemeToggle />
          <span className="header-tagline">
            A browser quiz by{' '}
            <a
              href="https://github.com/vijayanand1505"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vijay Anand
            </a>
          </span>
          {promptEvent && !isInstalled ? (
            <button
              className="button button-secondary button-small"
              onClick={installApp}
            >
              <Icon name="download" size={16} /> Install app
            </button>
          ) : (
            <a
              className="header-link"
              href="https://github.com/vijayanand1505/quiz-app"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
Header.propTypes = {
  activeArea: PropTypes.oneOf(['quiz', 'record']),
  quizLabel: PropTypes.string,
};
export default Header;
