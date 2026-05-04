import { create } from 'zustand'

export type Lang = 'ar' | 'en'

type LangState = {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

const STORAGE_KEY = 'cinma_lang'

function getInitial(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'en' || v === 'ar') return v
  } catch {}
  return 'ar'
}

// exported only for testing logic without creating a store
export const _getInitialLang = getInitial;

export const useLang = create<LangState>((set, get) => ({
  lang: getInitial(),
  setLang: (lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
    set({ lang })
  },
  toggle: () => {
    const next: Lang = get().lang === 'ar' ? 'en' : 'ar'
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    set({ lang: next })
  }
}))

