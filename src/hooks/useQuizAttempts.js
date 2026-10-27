import { useEffect, useState } from 'react';
import {
  ATTEMPTS_KEY,
  ATTEMPTS_CHANGED,
  getAttemptStatus,
} from '../utils/quizAttempts';

const useQuizAttempts = (settings) => {
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!settings?.customQuizKey || settings.isCustomPreview) return;
    const update = () => refresh((value) => value + 1);
    const onStorage = (event) => {
      if (event.key === ATTEMPTS_KEY || event.key === null) update();
    };
    window.addEventListener(ATTEMPTS_CHANGED, update);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener(ATTEMPTS_CHANGED, update);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', update);
    };
  }, [settings?.customQuizKey, settings?.isCustomPreview]);
  return getAttemptStatus(settings);
};
export default useQuizAttempts;
