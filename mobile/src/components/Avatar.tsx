import { useMemo } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '../lib/theme'

type AvatarProps = {
  size?: number
  uri?: string | null
  label: string
}

const getInitials = (value: string) => {
  const parts = value
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return 'AB'
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function Avatar({ size = 44, uri, label }: AvatarProps) {
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 3 }]}> 
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <Text style={styles.initials}>{getInitials(label)}</Text>
      )}
    </View>
  )
}

const createStyles = (theme: Theme) => {
  const { colors, fonts } = theme

  return StyleSheet.create({
    avatar: {
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    initials: {
      fontFamily: fonts.bodySemi,
      color: colors.indigo,
    },
  })
}
