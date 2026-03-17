import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import type { Session, User } from '@supabase/supabase-js'
import { useFonts } from 'expo-font'
import { Ionicons } from '@expo/vector-icons'
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import { supabase } from './src/lib/supabase'
import { RootStackParamList, RootTabParamList } from './src/lib/navigation'
import { I18nProvider, useI18n } from './src/lib/i18n'
import { ThemeProvider, useTheme } from './src/lib/theme'
import HomeScreen from './src/screens/HomeScreen'
import CreateSessionScreen from './src/screens/CreateSessionScreen'
import SessionScreen from './src/screens/SessionScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import ProfileEditScreen from './src/screens/ProfileEditScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<RootTabParamList>()

const LoadingScreen = () => {
  const { colors } = useTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cream,
        },
      }),
    [colors]
  )

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.indigo} />
    </View>
  )
}

type AuthHandlers = {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

type MainTabsProps = AuthHandlers & {
  user: User | null
}

const MainTabs = ({ user, onSignIn, onSignUp }: MainTabsProps) => {
  const { t } = useI18n()
  const { colors, fonts } = useTheme()
  const tabStyles = useMemo(
    () =>
      StyleSheet.create({
        tabBar: {
          backgroundColor: colors.paper,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        iconWrap: {
          width: 28,
          alignItems: 'center',
        },
      }),
    [colors]
  )

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const iconName =
          route.name === 'Home'
            ? 'home'
            : route.name === 'Create'
              ? 'add-circle'
              : 'settings'

        return {
          headerStyle: { backgroundColor: colors.cream },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: fonts.display,
            fontSize: 20,
            color: colors.ink,
          },
          headerTintColor: colors.ink,
          tabBarStyle: tabStyles.tabBar,
          tabBarActiveTintColor: colors.indigo,
          tabBarInactiveTintColor: colors.muted,
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={tabStyles.iconWrap}>
              <Ionicons
                name={focused ? iconName : (`${iconName}-outline` as keyof typeof Ionicons.glyphMap)}
                size={size}
                color={color}
              />
            </View>
          ),
        }
      }}
    >
      <Tab.Screen name="Home" options={{ title: t('nav.home') }}>
        {(props) => (
          <HomeScreen
            {...props}
            user={user}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Create" options={{ title: t('nav.create') }}>
        {(props) => (
          <CreateSessionScreen
            {...props}
            user={user}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Settings" options={{ title: t('nav.settings') }}>
        {(props) => <SettingsScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

const AppContent = () => {
  const { ready: i18nReady, t } = useI18n()
  const { ready: themeReady, colors, fonts, mode } = useTheme()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const initSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      setLoading(false)
    }

    initSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const handleSignUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  const user: User | null = session?.user ?? null

  if (!i18nReady || !themeReady) {
    return <LoadingScreen />
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer>
        {loading ? (
          <LoadingScreen />
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.cream },
              headerShadowVisible: false,
              headerTitleStyle: {
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.ink,
              },
              headerTintColor: colors.ink,
            }}
          >
            <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
              {() => (
                <MainTabs
                  user={user}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Session" options={{ title: t('nav.session') }}>
              {(props) => (
                <SessionScreen
                  {...props}
                  user={user}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile" options={{ title: t('nav.profile') }}>
              {(props) => (
                <ProfileScreen
                  {...props}
                  user={user}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                  onSignOut={handleSignOut}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ProfileEdit" options={{ title: t('nav.profileEdit') }}>
              {(props) => (
                <ProfileEditScreen
                  {...props}
                  user={user}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    Fraunces_600SemiBold,
  })

  return (
    <ThemeProvider>
      <I18nProvider>{fontsLoaded ? <AppContent /> : <LoadingScreen />}</I18nProvider>
    </ThemeProvider>
  )
}
