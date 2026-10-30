/** i18n — Swedish-first, English on demand */

const STORAGE_KEY = 'petzo_lang';
const originals = new Map();   // data-i18n key → Swedish innerHTML
let translations = null;       // English JSON (fetched lazily)
let currentLang = 'sv';

/** Snapshot every [data-i18n] element's innerHTML as the Swedish original */
function captureOriginals() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    originals.set(el.getAttribute('data-i18n'), el.innerHTML);
  });
}

/** Apply a language to all [data-i18n] elements */
function apply(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (lang === 'sv') {
      const sv = originals.get(key);
      if (sv !== undefined) el.innerHTML = sv;
    } else if (translations) {
      const val = translations[key];
      if (val !== undefined) el.innerHTML = val;
    }
  });
  document.documentElement.lang = lang;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/** Fetch English translations (once) */
async function fetchEnglish() {
  if (translations) return translations;
  const res = await fetch('/locales/en.json');
  translations = await res.json();
  return translations;
}

/**
 * Set the active language.
 * @param {'sv'|'en'} lang
 */
export async function setLang(lang) {
  if (lang === currentLang) return;
  if (lang === 'en') await fetchEnglish();
  apply(lang);
}

/** @returns {'sv'|'en'} */
export function getLang() {
  return currentLang;
}

/**
 * Translate a key (useful for JS-only strings like form messages).
 * Returns English if current lang is 'en' and the key exists, otherwise the fallback.
 * @param {string} key
 * @param {string} [fallback] Swedish fallback
 */
export function t(key, fallback) {
  if (currentLang === 'en' && translations && translations[key] !== undefined) {
    return translations[key];
  }
  return fallback !== undefined ? fallback : (originals.get(key) || key);
}

/**
 * Boot i18n: capture Swedish originals, then apply stored preference.
 * Awaitable so it finishes before the loader reveals the page.
 */
export async function init() {
  captureOriginals();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored !== 'sv') {
    await fetchEnglish();
    apply(stored);
  }
}
