import React, { useEffect, useRef, useState } from 'react';
import Layout from '../Layout';
import Loader from '../Loader';
import Main from '../Main';
import Quiz from '../Quiz';
import Result from '../Result';
import Record from '../Record';
import ChallengeInvite from '../ChallengeInvite';
import QuizBuilder from '../QuizBuilder';
import CustomQuizInvite from '../CustomQuizInvite';
import SavedQuestions from '../SavedQuestions';
import useBookmarks from '../../hooks/useBookmarks';
import { CUSTOM_QUIZ_PREFIX } from '../../utils/customQuiz';
import { CHALLENGE_PREFIX } from '../../utils/friendChallenge';
import { reserveQuizAttempt } from '../../utils/quizAttempts';
import useQuizAttempts from '../../hooks/useQuizAttempts';

import { shuffle } from '../../utils';
import {
  loadHistory,
  loadPersonalBests,
  loadLastTestNumber,
  saveHistory,
  findPersonalBest,
  isBetterRound,
  roundKey,
  HISTORY_LIMIT,
  normalizeTestName,
} from '../../utils/quizHistory';

const readLocation = () => {
  const hash = window.location.hash;
  if (hash === '#builder') return { area: 'builder', view: 'editor' };
  if (hash === '#builder/collections')
    return { area: 'builder', view: 'collections' };
  if (hash === '#bookmarks') return { area: 'bookmarks', view: 'saved' };
  if (hash.startsWith(CUSTOM_QUIZ_PREFIX))
    return {
      area: 'custom',
      view: 'invite',
      token: hash.slice(CUSTOM_QUIZ_PREFIX.length),
    };
  if (hash.startsWith(CHALLENGE_PREFIX))
    return {
      area: 'challenge',
      view: 'invite',
      token: hash.slice(CHALLENGE_PREFIX.length),
    };
  if (
    ['#record', '#record/recent', '#record/bests', '#record/progress'].includes(
      hash
    )
  ) {
    return {
      area: 'record',
      view:
        hash === '#record/progress'
          ? 'progress'
          : hash === '#record/bests'
          ? 'bests'
          : 'recent',
    };
  }
  return { area: 'quiz', view: 'recent' };
};

const App = () => {
  const bookmarks = useBookmarks();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(null);
  const [data, setData] = useState(null);
  const [countdownTime, setCountdownTime] = useState(null);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [personalBests, setPersonalBests] = useState(loadPersonalBests);
  const [lastTestNumber, setLastTestNumber] = useState(loadLastTestNumber);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [roundSettings, setRoundSettings] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [attemptError, setAttemptError] = useState('');
  const attemptStatus = useQuizAttempts(roundSettings);
  const startingRef = useRef(false);
  const attemptErrorRef = useRef(null);
  const completedRef = useRef(false);
  const areasRef = useRef(null);
  const [location, setLocation] = useState(readLocation);
  const [builderOpened, setBuilderOpened] = useState(
    () => readLocation().area === 'builder'
  );
  useEffect(() => {
    if (location.area === 'builder') setBuilderOpened(true);
  }, [location.area]);
  const pageKey = `${loading}|${isQuizStarted}|${isQuizCompleted}|${location.area}|${location.view}`;
  const previousPage = useRef(pageKey);
  useEffect(() => {
    setAttemptError('');
  }, [location.area, location.token]);
  useEffect(() => {
    if (attemptError) attemptErrorRef.current?.focus();
  }, [attemptError]);

  useEffect(() => {
    const onHashChange = () => setLocation(readLocation());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (previousPage.current === pageKey) return;
    previousPage.current = pageKey;
    window.scrollTo(0, 0);
    const heading = areasRef.current?.querySelector(
      `[data-area="${location.area}"] h1`
    );
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [pageKey, location.area]);

  const startQuiz = async (data, countdownTime, settings, challenge = null) => {
    if (startingRef.current || loading || isQuizStarted) return false;
    startingRef.current = true;
    setAttemptError('');
    let attempt = null;
    if (settings?.customQuizKey && !settings.isCustomPreview) {
      attempt = await reserveQuizAttempt(settings);
      if (!attempt.ok) {
        startingRef.current = false;
        setAttemptError(attempt.error);
        return false;
      }
    }
    setActiveAttempt(attempt);
    window.location.hash = '#quiz';
    completedRef.current = false;
    setRoundSettings({ ...settings, mode: settings?.mode ?? 'exam' });
    setActiveChallenge(challenge);
    setIsQuizCompleted(false);
    setResultData(null);
    setLoading(true);
    setLoadingMessage({
      title: 'Loading your quiz...',
      message: "It won't be long!",
    });
    setCountdownTime(countdownTime);

    setTimeout(() => {
      setData(data);
      setIsQuizStarted(true);
      setLoading(false);
      startingRef.current = false;
    }, 1000);
    return true;
  };

  const endQuiz = (resultData) => {
    if (completedRef.current) return;
    completedRef.current = true;
    window.location.hash = '#quiz';
    const round = {
      ...roundSettings,
      ...(activeAttempt?.tracked
        ? { attemptNumber: activeAttempt.number }
        : {}),
      ...(activeChallenge ? { challengeHost: activeChallenge.host } : {}),
      testNumber: lastTestNumber + 1,
      id:
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      completedAt: new Date().toISOString(),
      totalQuestions: resultData.totalQuestions,
      correctAnswers: resultData.correctAnswers,
      timeTaken: resultData.timeTaken,
      timeLimit: countdownTime,
    };
    setLastTestNumber(round.testNumber);
    const previousBest = findPersonalBest(personalBests, round);
    const nextHistory = [round, ...history].slice(0, HISTORY_LIMIT);
    setHistory(nextHistory);
    const nextBests = isBetterRound(round, previousBest)
      ? [
          round,
          ...personalBests.filter((item) => roundKey(item) !== roundKey(round)),
        ]
      : personalBests;
    setPersonalBests(nextBests);
    setStorageAvailable(saveHistory(nextHistory, nextBests, round.testNumber));
    setLoading(true);
    setLoadingMessage({
      title: 'Fetching your results...',
      message: 'Just a moment!',
    });

    setTimeout(() => {
      setIsQuizStarted(false);
      setIsQuizCompleted(true);
      setResultData({
        ...resultData,
        round,
        isPersonalBest: Boolean(
          previousBest && isBetterRound(round, previousBest)
        ),
        previousBest,
      });
      setLoading(false);
    }, 2000);
  };

  const replayQuiz = () => {
    const shuffledData = activeChallenge
      ? data
      : shuffle([...data]).map((element) => ({
          ...element,
          options: shuffle([...element.options]),
        }));
    return startQuiz(
      shuffledData,
      countdownTime,
      roundSettings,
      activeChallenge
    );
  };

  const resetQuiz = () => {
    window.location.hash = '#quiz';
    setLoading(true);
    setLoadingMessage({
      title: 'Loading the home screen.',
      message: 'Thank you for playing!',
    });

    setTimeout(() => {
      setActiveChallenge(null);
      setActiveAttempt(null);
      setData(null);
      setCountdownTime(null);
      setIsQuizStarted(false);
      setIsQuizCompleted(false);
      setResultData(null);
      setLoading(false);
    }, 1000);
  };

  const clearHistory = () => {
    setHistory([]);
    setPersonalBests([]);
    setLastTestNumber(0);
    setStorageAvailable(saveHistory([]));
  };

  const renameTest = (id, name) => {
    const customName = normalizeTestName(name);
    const updateRound = (round) => {
      if (round.id !== id) return round;
      const updated = { ...round };
      if (customName) updated.customName = customName;
      else delete updated.customName;
      return updated;
    };
    const nextHistory = history.map(updateRound);
    const nextBests = personalBests.map(updateRound);
    setHistory(nextHistory);
    setPersonalBests(nextBests);
    setResultData((current) =>
      current
        ? {
            ...current,
            round: updateRound(current.round),
            previousBest: current.previousBest
              ? updateRound(current.previousBest)
              : null,
          }
        : current
    );
    const saved = saveHistory(nextHistory, nextBests, lastTestNumber);
    setStorageAvailable(saved);
    return saved;
  };

  return (
    <Layout
      activeArea={
        ['challenge', 'custom'].includes(location.area) ? 'quiz' : location.area
      }
      quizHref={
        ['challenge', 'custom'].includes(location.area) &&
        !isQuizStarted &&
        !isQuizCompleted
          ? window.location.hash
          : '#quiz'
      }
      quizLabel={
        isQuizStarted
          ? 'Current quiz'
          : isQuizCompleted
          ? 'Quiz result'
          : location.area === 'challenge'
          ? 'Challenge'
          : location.area === 'custom'
          ? 'Shared quiz'
          : 'Take a quiz'
      }
    >
      {attemptError && (
        <div
          className="error-notice attempt-start-error"
          role="alert"
          ref={attemptErrorRef}
          tabIndex={-1}
        >
          {attemptError}
        </div>
      )}
      <div ref={areasRef}>
        <div
          className="app-area"
          data-area="quiz"
          hidden={location.area !== 'quiz'}
        >
          {loading && <Loader {...loadingMessage} />}
          {!loading && !isQuizStarted && !isQuizCompleted && (
            <Main startQuiz={startQuiz} />
          )}
          {!loading && isQuizStarted && (
            <Quiz
              data={data}
              countdownTime={countdownTime}
              attemptSettings={roundSettings}
              currentAttempt={activeAttempt}
              mode={roundSettings?.mode || 'exam'}
              bookmarks={bookmarks.items}
              onToggleBookmark={bookmarks.toggle}
              endQuiz={endQuiz}
              challengeHost={activeChallenge?.host}
              customQuizTitle={
                roundSettings?.customQuizKey ? roundSettings.topic : undefined
              }
              isActive={location.area === 'quiz'}
            />
          )}
          {!loading && isQuizCompleted && (
            <Result
              {...resultData}
              challenge={activeChallenge}
              questions={data}
              replayQuiz={replayQuiz}
              replayDisabled={attemptStatus.blocked}
              attemptSettings={roundSettings}
              currentAttempt={activeAttempt}
              resetQuiz={resetQuiz}
              onRenameTest={renameTest}
              bookmarks={bookmarks.items}
              onToggleBookmark={bookmarks.toggle}
            />
          )}
        </div>
        <div
          className="app-area"
          data-area="challenge"
          hidden={location.area !== 'challenge'}
        >
          {location.area === 'challenge' && (
            <ChallengeInvite
              token={location.token}
              quizActive={isQuizStarted}
              onStart={(challenge) =>
                startQuiz(
                  challenge.questions,
                  challenge.timeLimit,
                  challenge.settings,
                  challenge
                )
              }
            />
          )}
        </div>
        <div
          className="app-area"
          data-area="builder"
          hidden={location.area !== 'builder'}
        >
          {(builderOpened || location.area === 'builder') && (
            <QuizBuilder
              isActive={location.area === 'builder'}
              view={location.area === 'builder' ? location.view : 'editor'}
              quizActive={isQuizStarted || loading}
              onPlay={(quiz) => {
                if (!isQuizStarted && !loading)
                  return startQuiz(
                    quiz.questions,
                    quiz.timeLimit,
                    quiz.settings
                  );
                return false;
              }}
            />
          )}
        </div>
        <div
          className="app-area"
          data-area="custom"
          hidden={location.area !== 'custom'}
        >
          {location.area === 'custom' && (
            <CustomQuizInvite
              token={location.token}
              quizActive={isQuizStarted || loading}
              onPlay={(quiz) => {
                if (!isQuizStarted && !loading)
                  return startQuiz(
                    quiz.questions,
                    quiz.timeLimit,
                    quiz.settings
                  );
                return false;
              }}
            />
          )}
        </div>
        <div
          className="app-area"
          data-area="bookmarks"
          hidden={location.area !== 'bookmarks'}
        >
          {location.area === 'bookmarks' && (
            <SavedQuestions
              items={bookmarks.items}
              available={bookmarks.available}
              onRemove={bookmarks.remove}
              onRestore={bookmarks.restore}
              onPlay={startQuiz}
              quizActive={isQuizStarted || loading}
              lockedQuestions={
                isQuizStarted && roundSettings?.mode !== 'practice' ? data : []
              }
            />
          )}
        </div>
        <p
          className={bookmarks.available ? 'visually-hidden' : 'error-notice'}
          role="status"
        >
          {bookmarks.message}
          {!bookmarks.available &&
            ' Saved questions are available for this visit only. Browser storage is unavailable.'}
        </p>
        <div
          className="app-area"
          data-area="record"
          hidden={location.area !== 'record'}
        >
          {location.area === 'record' && (
            <Record
              view={location.view}
              rounds={history}
              personalBests={personalBests}
              onClear={clearHistory}
              onRename={renameTest}
              storageAvailable={storageAvailable}
              quizActive={isQuizStarted}
              quizUntimed={countdownTime === 0}
              quizCompleted={isQuizCompleted}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default App;
