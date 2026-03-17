import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import en from '../locales/en'
import my from '../locales/my'

export type Locale = 'en' | 'my'
export type TranslationKey = keyof typeof en

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  my,
}

const STORAGE_KEY = 'alphabook.locale'

const getDeviceLocale = (): Locale => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    if (locale && locale.toLowerCase().startsWith('my')) return 'my'
  } catch {
    // Ignore locale detection failures.
  }
  return 'en'
}

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : ''
  )
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  ready: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    const loadLocale = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (!active) return
        if (stored === 'en' || stored === 'my') {
          setLocaleState(stored)
        } else {
          setLocaleState(getDeviceLocale())
        }
      } catch {
        if (!active) return
        setLocaleState(getDeviceLocale())
      } finally {
        if (!active) return
        setReady(true)
      }
    }

    loadLocale()

    return () => {
      active = false
    }
  }, [])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    AsyncStorage.setItem(STORAGE_KEY, nextLocale).catch(() => {})
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const template = translations[locale][key] ?? en[key] ?? key
      return interpolate(template, vars)
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t, ready }), [locale, setLocale, t, ready])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
