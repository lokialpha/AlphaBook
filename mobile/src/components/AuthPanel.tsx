import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'

type AuthPanelProps = {
  title: string
  subtitle: string
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function AuthPanel({
  title,
  subtitle,
  onSignIn,
  onSignUp,
}: AuthPanelProps) {
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<'signin' | 'signup' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSignIn = async () => {
    setLoading('signin')
    setMessage(null)
    try {
      await onSignIn(email.trim(), password)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('auth.error.signIn'))
    } finally {
      setLoading(null)
    }
  }

  const handleSignUp = async () => {
    setLoading('signup')
    setMessage(null)
    try {
      await onSignUp(email.trim(), password)
      setMessage(t('auth.status.confirmEmail'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('auth.error.signUp'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.form}>
        <Text style={styles.label}>{t('auth.label.email')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('auth.placeholder.email')}
          placeholderTextColor={theme.colors.muted}
        />
        <Text style={styles.label}>{t('auth.label.password')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('auth.placeholder.password')}
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          onPress={handleSignIn}
          disabled={!!loading}
        >
          <Text style={styles.buttonText}>
            {loading === 'signin' ? t('auth.button.signingIn') : t('auth.button.signIn')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.buttonGhost, loading ? styles.buttonDisabled : null]}
          onPress={handleSignUp}
          disabled={!!loading}
        >
          <Text style={styles.buttonGhostText}>
            {loading === 'signup' ? t('auth.button.signingUp') : t('auth.button.create')}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) => {
  const { colors, fonts, radius, shadow, spacing } = theme

  return StyleSheet.create({
    panel: {
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.paper,
      borderColor: colors.border,
      borderWidth: 1,
      ...shadow.card,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.ink,
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
      marginBottom: spacing.md,
    },
    form: {
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.bodySemi,
      color: colors.ink,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.paper,
      fontFamily: fonts.body,
      color: colors.ink,
    },
    message: {
      marginTop: spacing.sm,
      color: colors.muted,
      fontFamily: fonts.body,
    },
    actions: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    button: {
      backgroundColor: colors.indigo,
      paddingVertical: 12,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontFamily: fonts.bodySemi,
    },
    buttonGhost: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    buttonGhostText: {
      color: colors.indigo,
      fontFamily: fonts.bodySemi,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  })
}
