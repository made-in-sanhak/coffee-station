import { useEffect, useRef, useState } from 'react';
import { native } from '../../app/native';
import { readableError } from './socialModel';

export function useSavedMeetup(id: string) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ready = useRef(false);
  const writing = useRef(false);
  const generation = useRef(0);
  const key = `coffee.saved-meetup.${id}`;

  useEffect(() => {
    const current = ++generation.current;
    ready.current = false;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => native.secureGet(key))
      .then(value => {
        if (current !== generation.current) return;
        setSaved(value === '1');
        ready.current = true;
      })
      .catch(reason => {
        if (current === generation.current) setError(readableError(reason));
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current = current + 1;
    };
  }, [key, attempt]);

  const toggle = async () => {
    if (!ready.current || writing.current) return;
    const current = generation.current;
    const next = !saved;
    writing.current = true;
    setLoading(true);
    setError(null);
    try {
      await native.secureSet(key, next ? '1' : '0');
      if (current === generation.current) setSaved(next);
    } catch (reason) {
      if (current === generation.current) setError(readableError(reason));
    } finally {
      writing.current = false;
      if (current === generation.current) setLoading(false);
    }
  };
  return {
    saved,
    loading,
    disabled: loading || !ready.current,
    error,
    toggle,
    reload: () => setAttempt(value => value + 1),
  };
}
