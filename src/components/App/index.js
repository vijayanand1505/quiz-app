import React, { useEffect, useRef, useState } from 'react';
import Layout from '../Layout';
import Loader from '../Loader';
import Main from '../Main';
import Quiz from '../Quiz';
import Result from '../Result';
import Record from '../Record';

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
  const completedRef = useRef(false);
  const areasRef = useRef(null);
  const [location, setLocation] = useState(readLocation);
  const pageKey = `${loading}|${isQuizStarted}|${isQuizCompleted}|${location.area}|${location.view}`;
  const previousPage = useRef(pageKey);

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

  const startQuiz = (data, countdownTime, settings) => {
    window.location.hash = '#quiz';
    completedRef.current = false;
    setRoundSettings(settings);
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
    }, 1000);
  };

  const endQuiz = (resultData) => {
    if (completedRef.current) return;
    completedRef.current = true;
    window.location.hash = '#quiz';
    const round = {
      ...roundSettings,
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
    window.location.hash = '#quiz';
    completedRef.current = false;
    setLoading(true);
    setLoadingMessage({
      title: 'Getting ready for round two.',
      message: "It won't take long!",
    });

    const shuffledData = shuffle([...data]).map((element) => ({
      ...element,
      options: shuffle([...element.options]),
    }));

    setData(shuffledData);

    setTimeout(() => {
      setIsQuizStarted(true);
      setIsQuizCompleted(false);
      setResultData(null);
      setLoading(false);
    }, 1000);
  };

  const resetQuiz = () => {
    window.location.hash = '#quiz';
    setLoading(true);
    setLoadingMessage({
      title: 'Loading the home screen.',
      message: 'Thank you for playing!',
    });

    setTimeout(() => {
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
      activeArea={location.area}
      quizLabel={
        isQuizStarted
          ? 'Current quiz'
          : isQuizCompleted
          ? 'Quiz result'
          : 'Take a quiz'
      }
    >
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
              endQuiz={endQuiz}
              isActive={location.area === 'quiz'}
            />
          )}
          {!loading && isQuizCompleted && (
            <Result
              {...resultData}
              replayQuiz={replayQuiz}
              resetQuiz={resetQuiz}
              onRenameTest={renameTest}
            />
          )}
        </div>
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
