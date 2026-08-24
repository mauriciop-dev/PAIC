import { useState, useCallback } from 'react';

const STORAGE_KEY = 'paic_detailed_onboarding';

interface OnboardingProgress {
  completed: number[];
}

export function useOnboardingProgress(userId: string) {
  const getProgress = useCallback((): OnboardingProgress => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : { completed: [] };
    } catch {
      return { completed: [] };
    }
  }, [userId]);

  const [progress, setProgress] = useState<OnboardingProgress>(getProgress);

  const saveProgress = useCallback((p: OnboardingProgress) => {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(p));
    setProgress(p);
  }, [userId]);

  const isComplete = useCallback((optionId: number): boolean => {
    return progress.completed.includes(optionId);
  }, [progress]);

  const markComplete = useCallback((optionId: number) => {
    const p = getProgress();
    if (!p.completed.includes(optionId)) {
      p.completed.push(optionId);
      saveProgress(p);
    }
  }, [getProgress, saveProgress]);

  const getNextPending = useCallback((): number | null => {
    for (let i = 2; i <= 10; i++) {
      if (!progress.completed.includes(i)) return i;
    }
    return null;
  }, [progress]);

  const getAll = useCallback((): { id: number; completed: boolean }[] => {
    return Array.from({ length: 9 }, (_, i) => ({
      id: i + 2,
      completed: progress.completed.includes(i + 2),
    }));
  }, [progress]);

  const reset = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
    setProgress({ completed: [] });
  }, [userId]);

  return { isComplete, markComplete, getNextPending, getAll, reset, progress };
}
