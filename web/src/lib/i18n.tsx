import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import en from '../locales/en'
import { I18nContext, type Locale, type TranslationKey, translations } from './i18nContext'

const STORAGE_KEY = 'alphabook.locale'

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'my') return stored
  const browser = window.navigator.language.toLowerCase()
  if (browser.startsWith('my')) return 'my'
  return 'en'
}

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : ''
  )
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const template = translations[locale][key] ?? en[key] ?? key
      return interpolate(template, vars)
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
