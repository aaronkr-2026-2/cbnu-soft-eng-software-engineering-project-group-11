import { useAppStore } from '../store/app-store';
import { translations, type TranslationKey } from './translations';
export function useTranslation() {
  const language = useAppStore((state) => state.language);
  return { t: (key: TranslationKey, values: Record<string, string | number> = {}) =>
    translations[language][key].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match)), language };
}
