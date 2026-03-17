import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../lib/types'
import AuthPanel from '../components/AuthPanel'
import { useI18n } from '../lib/i18n'

type ProfileProps = {
  user: User | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function Profile({ user, onSignIn, onSignUp }: ProfileProps) {
  const { t } = useI18n()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const MAX_AVATAR_SIZE = 5 * 1024 * 1024

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
    }

    fetchProfile()

    return () => {
      active = false
    }
  }, [user, t])

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

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarMessage(null)
    setAvatarError(null)

    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profile.photo.error.fileType'))
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError(t('profile.photo.error.fileSize'))
      return
    }

    setUploading(true)

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
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
    event.target.value = ''
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
  }

  if (!user) {
    return (
      <div className="page">
        <section className="section narrow">
          <AuthPanel
            title={t('profile.auth.title')}
            subtitle={t('profile.auth.subtitle')}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="section narrow">
        <h2>{t('profile.title')}</h2>
        <p className="section-subtitle">{t('profile.subtitle')}</p>

        <form className="form" onSubmit={handleSave}>
          <div className="profile-avatar">
            <div className="avatar-frame">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={t('profile.photo.alt', {
                    name: displayName || t('common.reader'),
                  })}
                  className="avatar-image"
                />
              ) : (
                <span className="avatar-placeholder">
                  {getInitials(displayName || user.email || 'Alpha Book')}
                </span>
              )}
            </div>
            <div className="avatar-controls">
              <label className="field">
                <span>{t('profile.photo.label')}</span>
                <input
                  className="avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
              <p className="form-note">{t('profile.photo.note')}</p>
              {uploading ? <p className="form-note">{t('profile.photo.uploading')}</p> : null}
              {avatarError ? <p className="form-error">{avatarError}</p> : null}
              {avatarMessage ? <p className="form-note">{avatarMessage}</p> : null}
            </div>
          </div>
          <label className="field field-full">
            <span>{t('profile.displayName')}</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          {message ? <p className="form-note">{message}</p> : null}
          <button className="button" type="submit" disabled={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </form>
      </section>
    </div>
  )
}
