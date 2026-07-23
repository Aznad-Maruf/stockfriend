import { en } from './en';
import { bn } from './bn';

export const translations = {
  en,
  bn
};

export const t = (translations, lang, path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], translations[lang]);
};
