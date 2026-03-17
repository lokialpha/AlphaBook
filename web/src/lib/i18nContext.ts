import { createContext } from 'react'
import en from '../locales/en'
import my from '../locales/my'

export type Locale = 'en' | 'my'
export type TranslationKey = keyof typeof en

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  my,
}

export type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)
