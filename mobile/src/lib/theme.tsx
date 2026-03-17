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
import { Appearance } from 'react-native'

const lightColors = {
  ink: '#1d1c1b',
  muted: '#5c5a55',
  cream: '#f4efe6',
  paper: '#fffdf8',
  stone: '#e9e1d4',
  sage: '#8aa393',
  peach: '#e7a77f',
  indigo: '#2d3142',
  danger: '#b42318',
  border: 'rgba(29, 28, 27, 0.08)',
  overlay: 'rgba(45, 49, 66, 0.08)',
}

const darkColors = {
  ink: '#f5f1e8',
  muted: '#b9b2a7',
  cream: '#161512',
  paper: '#22201c',
  stone: '#2a2621',
  sage: '#88b6a2',
  peach: '#e3a67c',
  indigo: '#5f6ee9',
  danger: '#ff6b6b',
  border: 'rgba(245, 241, 232, 0.12)',
  overlay: 'rgba(245, 241, 232, 0.08)',
}

const tokens = {
  radius: {
    lg: 24,
    md: 16,
    sm: 10,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  shadow: {
    card: {
      shadowColor: '#1d1c1b',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
  },
  fonts: {
    body: 'SpaceGrotesk_400Regular',
    bodySemi: 'SpaceGrotesk_600SemiBold',
    display: 'Fraunces_600SemiBold',
  },
}

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'
export type Theme = typeof tokens & { colors: typeof lightColors; mode: ThemeMode }

const buildTheme = (mode: ThemeMode): Theme => ({
  ...tokens,
  colors: mode === 'dark' ? darkColors : lightColors,
  mode,
})

const STORAGE_KEY = 'alphabook.theme'

const getSystemMode = (): ThemeMode =>
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'

type ThemeContextValue = Theme & {
  preference: ThemePreference
  setMode: (mode: ThemePreference) => void
  toggleMode: () => void
  ready: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [systemMode, setSystemMode] = useState<ThemeMode>(getSystemMode())
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    const loadMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (!active) return
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored)
        } else {
          setPreferenceState('system')
        }
      } catch {
        if (!active) return
        setPreferenceState('system')
      } finally {
        if (!active) return
        setReady(true)
      }
    }

    loadMode()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme === 'dark' ? 'dark' : 'light')
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const setMode = useCallback((nextMode: ThemePreference) => {
    setPreferenceState(nextMode)
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {})
  }, [])

  const toggleMode = useCallback(() => {
    setPreferenceState((prev) => {
      const activeMode = prev === 'system' ? systemMode : prev
      const next: ThemePreference = activeMode === 'dark' ? 'light' : 'dark'
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
      return next
    })
  }, [systemMode])

  const mode = preference === 'system' ? systemMode : preference
  const theme = useMemo(() => buildTheme(mode), [mode])

  const value = useMemo(
    () => ({ ...theme, preference, setMode, toggleMode, ready }),
    [theme, preference, setMode, toggleMode, ready]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
