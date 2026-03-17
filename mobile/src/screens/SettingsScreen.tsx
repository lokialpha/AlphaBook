import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'
import { AppTabScreenProps } from '../lib/navigation'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'

export type SettingsScreenProps =
  AppTabScreenProps<'Settings'> & {
    user: User | null
  }

const getAppVersion = () => {
  if (Constants.expoConfig?.version) return Constants.expoConfig.version
  if (Constants.nativeAppVersion) return Constants.nativeAppVersion
  return '1.0.0'
}

export default function SettingsScreen({
  user,
  navigation,
}: SettingsScreenProps) {
  const { locale, setLocale, t } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const appVersion = getAppVersion()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.rowLink}>
            <View style={styles.rowText}>
              <Text style={styles.sectionTitle}>{t('settings.profile.title')}</Text>
              <Text style={styles.sectionSubtitle}>{t('settings.profile.subtitle')}</Text>
            </View>
            <Text style={styles.rowChevron}>{'>'}</Text>
          </View>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.language.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.language.subtitle')}</Text>
          <View style={styles.languageList}>
            <Pressable
              style={[styles.languageRow, locale === 'en' ? styles.languageRowActive : null]}
              onPress={() => setLocale('en')}
            >
              <Text style={[styles.languageRowText, locale === 'en' ? styles.languageRowTextActive : null]}>
                {t('settings.language.en')}
              </Text>
              {locale === 'en' ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.indigo} />
              ) : null}
            </Pressable>
            <View style={styles.languageDivider} />
            <Pressable
              style={[styles.languageRow, locale === 'my' ? styles.languageRowActive : null]}
              onPress={() => setLocale('my')}
            >
              <Text style={[styles.languageRowText, locale === 'my' ? styles.languageRowTextActive : null]}>
                {t('settings.language.my')}
              </Text>
              {locale === 'my' ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.indigo} />
              ) : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.appearance.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.appearance.subtitle')}</Text>
          <View style={styles.appearanceList}>
            <Pressable
              style={[
                styles.appearanceRow,
                theme.preference === 'system' ? styles.appearanceRowActive : null,
              ]}
              onPress={() => theme.setMode('system')}
            >
              <Text
                style={[
                  styles.appearanceRowText,
                  theme.preference === 'system' ? styles.appearanceRowTextActive : null,
                ]}
              >
                {t('settings.appearance.system')}
              </Text>
              {theme.preference === 'system' ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.indigo} />
              ) : null}
            </Pressable>
            <View style={styles.appearanceDivider} />
            <Pressable
              style={[
                styles.appearanceRow,
                theme.preference === 'light' ? styles.appearanceRowActive : null,
              ]}
              onPress={() => theme.setMode('light')}
            >
              <Text
                style={[
                  styles.appearanceRowText,
                  theme.preference === 'light' ? styles.appearanceRowTextActive : null,
                ]}
              >
                {t('settings.appearance.light')}
              </Text>
              {theme.preference === 'light' ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.indigo} />
              ) : null}
            </Pressable>
            <View style={styles.appearanceDivider} />
            <Pressable
              style={[
                styles.appearanceRow,
                theme.preference === 'dark' ? styles.appearanceRowActive : null,
              ]}
              onPress={() => theme.setMode('dark')}
            >
              <Text
                style={[
                  styles.appearanceRowText,
                  theme.preference === 'dark' ? styles.appearanceRowTextActive : null,
                ]}
              >
                {t('settings.appearance.dark')}
              </Text>
              {theme.preference === 'dark' ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.indigo} />
              ) : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.account.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.account.subtitle')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('settings.account.emailLabel')}</Text>
            <Text style={styles.infoValue}>{user?.email ?? t('settings.account.guest')}</Text>
          </View>
          {!user ? <Text style={styles.note}>{t('settings.account.signInHint')}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.about.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.about.subtitle')}</Text>
          <Text style={styles.infoValue}>{t('settings.about.version', { version: appVersion })}</Text>
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
    card: {
      backgroundColor: colors.paper,
      borderRadius: radius.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.ink,
    },
    sectionSubtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    languageList: {
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.paper,
      overflow: 'hidden',
    },
    rowLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    rowText: {
      flex: 1,
      gap: 4,
    },
    rowChevron: {
      fontFamily: fonts.bodySemi,
      color: colors.muted,
    },
    languageRow: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    languageRowActive: {
      backgroundColor: colors.overlay,
    },
    languageDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    languageRowText: {
      fontFamily: fonts.body,
      color: colors.ink,
      fontSize: 15,
    },
    languageRowTextActive: {
      fontFamily: fonts.bodySemi,
      color: colors.indigo,
    },
    appearanceList: {
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.paper,
      overflow: 'hidden',
    },
    appearanceRow: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    appearanceRowActive: {
      backgroundColor: colors.overlay,
    },
    appearanceDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    appearanceRowText: {
      fontFamily: fonts.body,
      color: colors.ink,
      fontSize: 15,
    },
    appearanceRowTextActive: {
      fontFamily: fonts.bodySemi,
      color: colors.indigo,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    infoLabel: {
      fontFamily: fonts.bodySemi,
      color: colors.muted,
    },
    infoValue: {
      fontFamily: fonts.body,
      color: colors.ink,
    },
    note: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
  })
}
