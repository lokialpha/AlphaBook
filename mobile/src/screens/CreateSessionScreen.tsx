import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AppTabScreenProps } from '../lib/navigation'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'
import AuthPanel from '../components/AuthPanel'

const splitChapters = (value: string) => {
  const list = value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
  return list.length > 0 ? list : null
}

type FormState = {
  title: string
  author: string
  totalChapters: string
  totalPages: string
  chapterList: string
  coverUrl: string
}

export type CreateSessionScreenProps =
  AppTabScreenProps<'Create'> & {
    user: User | null
    onSignIn: (email: string, password: string) => Promise<void>
    onSignUp: (email: string, password: string) => Promise<void>
  }

export default function CreateSessionScreen({
  user,
  onSignIn,
  onSignUp,
  navigation,
}: CreateSessionScreenProps) {
  const { t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [formState, setFormState] = useState<FormState>({
    title: '',
    author: '',
    totalChapters: '12',
    totalPages: '320',
    chapterList: '',
    coverUrl: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    const chapterList = splitChapters(formState.chapterList)
    const totalChapters = Number(formState.totalChapters)
    const totalPages = Number(formState.totalPages)

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: formState.title.trim(),
        author: formState.author.trim(),
        total_chapters: totalChapters,
        total_pages: totalPages,
        chapter_list: chapterList,
        cover_url: formState.coverUrl.trim() || null,
      })
      .select()
      .single()

    if (bookError || !book) {
      setError(bookError?.message ?? t('create.error.book'))
      setLoading(false)
      return
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        book_id: book.id,
        created_by: user.id,
      })
      .select()
      .single()

    if (sessionError || !session) {
      setError(sessionError?.message ?? t('create.error.session'))
      setLoading(false)
      return
    }

    setLoading(false)
    navigation.navigate('Session', { id: session.id })
  }

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AuthPanel
          title={t('create.auth.title')}
          subtitle={t('create.auth.subtitle')}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
        />
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.title}>{t('create.title')}</Text>
        <Text style={styles.subtitle}>{t('create.subtitle')}</Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>{t('create.field.title')}</Text>
            <TextInput
              style={styles.input}
              value={formState.title}
              onChangeText={(value) => handleChange('title', value)}
              placeholder={t('create.placeholder.title')}
              placeholderTextColor={theme.colors.muted}
            />
          </View>
          <View>
            <Text style={styles.label}>{t('create.field.author')}</Text>
            <TextInput
              style={styles.input}
              value={formState.author}
              onChangeText={(value) => handleChange('author', value)}
              placeholder={t('create.placeholder.author')}
              placeholderTextColor={theme.colors.muted}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>{t('create.field.totalChapters')}</Text>
              <TextInput
                style={styles.input}
                value={formState.totalChapters}
                onChangeText={(value) => handleChange('totalChapters', value)}
                keyboardType="numeric"
                placeholder={t('create.placeholder.totalChapters')}
                placeholderTextColor={theme.colors.muted}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>{t('create.field.totalPages')}</Text>
              <TextInput
                style={styles.input}
                value={formState.totalPages}
                onChangeText={(value) => handleChange('totalPages', value)}
                keyboardType="numeric"
                placeholder={t('create.placeholder.totalPages')}
                placeholderTextColor={theme.colors.muted}
              />
            </View>
          </View>
          <View>
            <Text style={styles.label}>{t('create.field.chapterList')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formState.chapterList}
              onChangeText={(value) => handleChange('chapterList', value)}
              placeholder={t('create.placeholder.chapterList')}
              placeholderTextColor={theme.colors.muted}
              multiline
            />
          </View>
          <View>
            <Text style={styles.label}>{t('create.field.coverUrl')}</Text>
            <TextInput
              style={styles.input}
              value={formState.coverUrl}
              onChangeText={(value) => handleChange('coverUrl', value)}
              placeholder={t('create.placeholder.coverUrl')}
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? t('create.button.creating') : t('create.button.create')}
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
    section: {
      gap: spacing.md,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 26,
      color: colors.ink,
    },
    subtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    form: {
      gap: spacing.md,
      backgroundColor: colors.paper,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
    },
    label: {
      fontFamily: fonts.bodySemi,
      color: colors.ink,
      marginBottom: 6,
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
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    fieldHalf: {
      flex: 1,
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
    error: {
      color: colors.danger,
      fontFamily: fonts.bodySemi,
    },
  })
}
