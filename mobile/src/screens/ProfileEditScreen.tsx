import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { User } from '@supabase/supabase-js'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { RootStackParamList } from '../lib/navigation'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'
import AuthPanel from '../components/AuthPanel'
import Avatar from '../components/Avatar'

export type ProfileEditScreenProps =
  NativeStackScreenProps<RootStackParamList, 'ProfileEdit'> & {
    user: User | null
    onSignIn: (email: string, password: string) => Promise<void>
    onSignUp: (email: string, password: string) => Promise<void>
  }

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

export default function ProfileEditScreen({
  user,
  onSignIn,
  onSignUp,
}: ProfileEditScreenProps) {
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
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

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      display_name: displayName.trim(),
      avatar_url: avatarUrl ?? null,
    })

    setSaving(false)
    setMessage(error ? error.message : t('profile.saved'))

    if (!error) {
      setDisplayName((current) => current.trim())
    }
  }

  const handlePickAvatar = async () => {
    if (!user) return
    setAvatarMessage(null)
    setAvatarError(null)

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setAvatarError(t('profile.photo.error.permission'))
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })

    if (result.canceled) return

    const asset = result.assets?.[0]
    if (!asset || !asset.base64) {
      setAvatarError(t('profile.photo.error.read'))
      return
    }

    if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE) {
      setAvatarError(t('profile.photo.error.fileSize'))
      return
    }

    setUploading(true)

    const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `${user.id}/${Date.now()}.${fileExt}`
    const fileData = decode(asset.base64)
    const contentType = asset.mimeType ?? 'image/jpeg'

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileData, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      })

    if (uploadError) {
      setAvatarError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const nextAvatarUrl = publicData.publicUrl

    const { error: updateError } = await supabase.from('users').upsert({
      id: user.id,
      display_name: displayName.trim(),
      avatar_url: nextAvatarUrl,
    })

    if (updateError) {
      setAvatarError(updateError.message)
    } else {
      setAvatarUrl(nextAvatarUrl)
      setAvatarMessage(t('profile.photo.updated'))
    }

    setUploading(false)
  }

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
        <Text style={styles.title}>{t('profile.edit.title')}</Text>
        <Text style={styles.subtitle}>{t('profile.edit.subtitle')}</Text>

        <View style={styles.avatarCard}>
          <Avatar
            size={92}
            uri={avatarUrl}
            label={displayName || user.email || t('app.name')}
          />
          <View style={styles.avatarControls}>
            <Text style={styles.label}>{t('profile.photo.label')}</Text>
            <Pressable
              style={[styles.buttonGhost, uploading ? styles.buttonDisabled : null]}
              onPress={handlePickAvatar}
              disabled={uploading}
            >
              <Text style={styles.buttonGhostText}>
                {uploading ? t('profile.photo.uploading') : t('profile.photo.upload')}
              </Text>
            </Pressable>
            <Text style={styles.note}>{t('profile.photo.note')}</Text>
            {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
            {avatarMessage ? <Text style={styles.note}>{avatarMessage}</Text> : null}
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('profile.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
              onChangeText={setDisplayName}
            />
            {message ? <Text style={styles.note}>{message}</Text> : null}
            <Pressable
              style={[styles.button, saving ? styles.buttonDisabled : null]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? t('profile.saving') : t('profile.save')}
            </Text>
          </Pressable>
        </View>
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
    avatarControls: {
      flex: 1,
      gap: 6,
    },
    form: {
      backgroundColor: colors.paper,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      ...shadow.card,
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
      paddingVertical: 10,
      paddingHorizontal: 14,
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
    note: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    error: {
      fontFamily: fonts.bodySemi,
      color: colors.danger,
    },
  })
}
