import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useSettingsData<T>(load: () => Promise<T>) {
  const [result, setResult] = useState<{ data?: T; error?: boolean; loading: boolean; revision?: number }>({ loading: true });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    setResult(previous => ({ ...previous, error: false, loading: true }));
    void load().then(data => { if (active) setResult({ data, loading: false, revision }); }, () => { if (active) setResult({ error: true, loading: false }); });
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { active = false; listener.remove(); };
  }, [load, revision, refresh]));
  return { ...result, refresh };
}
