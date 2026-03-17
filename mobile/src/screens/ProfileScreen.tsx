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
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { RootStackParamList } from '../lib/navigation'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'
import AuthPanel from '../components/AuthPanel'
import Avatar from '../components/Avatar'

export type ProfileScreenProps =
  NativeStackScreenProps<RootStackParamList, 'Profile'> & {
    user: User | null
    onSignIn: (email: string, password: string) => Promise<void>
    onSignUp: (email: string, password: string) => Promise<void>
    onSignOut: () => void
  }

export default function ProfileScreen({
  user,
  onSignIn,
  onSignUp,
  onSignOut,
  navigation,
}: ProfileScreenProps) {
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      const profileData = data as Profile | null
      setDisplayName(
        profileData?.display_name ||
          user.user_metadata?.full_name ||
          user.email ||
          t('common.reader')
      )
      setAvatarUrl(profileData?.avatar_url ?? null)
      setLoading(false)
    }

    fetchProfile()

    return () => {
      active = false
    }
  }, [user, t])

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AuthPanel
          title={t('profile.auth.title')}
          subtitle={t('profile.auth.subtitle')}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
        />
      </ScrollView>
    )
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.indigo} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
          </View>
          <Pressable
            style={styles.buttonGhost}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <Text style={styles.buttonGhostText}>{t('profile.edit.action')}</Text>
          </Pressable>
        </View>

        <View style={styles.avatarCard}>
          <Avatar
            size={92}
            uri={avatarUrl}
            label={displayName || user.email || t('app.name')}
          />
          <View style={styles.avatarInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.meta}>{user.email ?? t('settings.account.guest')}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.displayName')}</Text>
            <Text style={styles.value}>{displayName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.emailLabel')}</Text>
            <Text style={styles.value}>{user.email ?? t('settings.account.guest')}</Text>
          </View>
        </View>

        <Pressable style={styles.buttonDanger} onPress={onSignOut}>
          <Text style={styles.buttonDangerText}>{t('profile.signOut')}</Text>
        </Pressable>
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
    },
    loading: {
      flex: 1,
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: colors.ink,
    },
    subtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    avatarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.stone,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarInfo: {
      flex: 1,
      gap: 4,
    },
    name: {
      fontFamily: fonts.bodySemi,
      fontSize: 18,
      color: colors.ink,
    },
    meta: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    infoCard: {
      backgroundColor: colors.paper,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      ...shadow.card,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.bodySemi,
      color: colors.muted,
    },
    value: {
      fontFamily: fonts.body,
      color: colors.ink,
    },
    buttonGhost: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    buttonGhostText: {
      color: colors.indigo,
      fontFamily: fonts.bodySemi,
    },
    buttonDanger: {
      backgroundColor: colors.danger,
      paddingVertical: 12,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    buttonDangerText: {
      color: '#fff',
      fontFamily: fonts.bodySemi,
    },
  })
}
