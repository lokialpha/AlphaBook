import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '../lib/theme'

type ProgressBarProps = {
  label: string
  value: number
  total: number
  tone?: 'sage' | 'peach' | 'indigo'
}

export default function ProgressBar({ label, value, total, tone }: ProgressBarProps) {
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const percentage = total > 0 ? Math.min(value / total, 1) : 0
  const fillColor =
    tone === 'sage'
      ? theme.colors.sage
      : tone === 'indigo'
        ? theme.colors.indigo
        : theme.colors.peach

  return (
    <View style={styles.wrap}>
      <View style={styles.meta}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value}/{total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage * 100}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) => {
  const { colors, fonts } = theme

  return StyleSheet.create({
    wrap: {
      gap: 6,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    label: {
      fontFamily: fonts.bodySemi,
      color: colors.ink,
    },
    value: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    track: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.stone,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 999,
    },
  })
}
