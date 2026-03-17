import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Session } from '../lib/types'
import { AppTabScreenProps } from '../lib/navigation'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'
import AuthPanel from '../components/AuthPanel'

export type HomeScreenProps = AppTabScreenProps<'Home'> & {
  user: User | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function HomeScreen({ user, onSignIn, onSignUp, navigation }: HomeScreenProps) {
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const fetchSessions = async () => {
      if (!user) {
        setSessions([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(
          `id,
           created_at,
           created_by,
           book:books (id, title, author, total_chapters, total_pages, cover_url)`
        )
        .order('created_at', { ascending: false })

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        setSessions([])
      } else {
        setError(null)
        setSessions((data as unknown as Session[]) || [])
      }
      setLoading(false)
    }

    fetchSessions()

    return () => {
      active = false
    }
  }, [user])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>
          {t('home.subtitle')}
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.button} onPress={() => navigation.navigate('Create')}>
            <Text style={styles.buttonText}>{t('home.cta.create')}</Text>
          </Pressable>
          <Pressable
            style={styles.buttonGhost}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.buttonGhostText}>{t('home.cta.settings')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.sectionTitle}>{t('home.section.title')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('home.section.subtitle')}
            </Text>
          </View>
          <Pressable style={styles.buttonGhost} onPress={() => navigation.navigate('Create')}>
            <Text style={styles.buttonGhostText}>{t('home.section.action')}</Text>
          </Pressable>
        </View>

        {!user ? (
          <AuthPanel
            title={t('home.auth.title')}
            subtitle={t('home.auth.subtitle')}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
          />
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.indigo} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('home.section.error', { error })}
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('home.section.empty')}</Text>
          </View>
        ) : (
          <View style={styles.sessionGrid}>
            {sessions.map((session) => (
              <Pressable
                key={session.id}
                style={styles.sessionCard}
                onPress={() => navigation.navigate('Session', { id: session.id })}
              >
                <View>
                  <Text style={styles.sessionTitle}>
                    {session.book?.title ?? t('home.session.untitled')}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {session.book?.author ?? t('home.session.unknownAuthor')}
                  </Text>
                </View>
                <View style={styles.sessionStats}>
                  <Text style={styles.sessionMeta}>
                    {t('home.session.chapters', {
                      count: session.book?.total_chapters ?? 0,
                    })}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {t('home.session.pages', {
                      count: session.book?.total_pages ?? 0,
                    })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const createStyles = (theme: Theme) => {
  const { colors, fonts, radius, shadow, spacing } = theme

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.cream,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.xl,
    },
    hero: {
      gap: spacing.md,
    },
    eyebrow: {
      textTransform: 'uppercase',
      letterSpacing: 2,
      fontSize: 12,
      fontFamily: fonts.bodySemi,
      color: colors.muted,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 28,
      color: colors.ink,
    },
    subtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
      fontSize: 15,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    section: {
      gap: spacing.md,
    },
    sectionHead: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: colors.ink,
    },
    sectionSubtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    button: {
      backgroundColor: colors.indigo,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: radius.pill,
    },
    buttonText: {
      color: '#fff',
      fontFamily: fonts.bodySemi,
    },
    buttonGhost: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
    },
    buttonGhostText: {
      color: colors.indigo,
      fontFamily: fonts.bodySemi,
    },
    centered: {
      paddingVertical: spacing.lg,
    },
    emptyState: {
      backgroundColor: colors.overlay,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    sessionGrid: {
      gap: spacing.md,
    },
    sessionCard: {
      backgroundColor: colors.paper,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
      gap: spacing.sm,
    },
    sessionTitle: {
      fontFamily: fonts.bodySemi,
      fontSize: 16,
      color: colors.ink,
    },
    sessionMeta: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    sessionStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  })
}
