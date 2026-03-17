import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import AuthPanel from '../components/AuthPanel'
import { useI18n } from '../lib/i18n'

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
  totalChapters: number
  totalPages: number
  chapterList: string
  coverUrl: string
}

type CreateSessionProps = {
  user: User | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function CreateSession({
  user,
  onSignIn,
  onSignUp,
}: CreateSessionProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [formState, setFormState] = useState<FormState>({
    title: '',
    author: '',
    totalChapters: 12,
    totalPages: 320,
    chapterList: '',
    coverUrl: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    const chapterList = splitChapters(formState.chapterList)

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: formState.title.trim(),
        author: formState.author.trim(),
        total_chapters: Number(formState.totalChapters),
        total_pages: Number(formState.totalPages),
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
    navigate(`/sessions/${session.id}`)
  }

  if (!user) {
    return (
      <div className="page">
        <section className="section narrow">
          <AuthPanel
            title={t('create.auth.title')}
            subtitle={t('create.auth.subtitle')}
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
        <h2>{t('create.title')}</h2>
        <p className="section-subtitle">{t('create.subtitle')}</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>{t('create.field.title')}</span>
              <input
                type="text"
                required
                value={formState.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder={t('create.placeholder.title')}
              />
            </label>
            <label className="field">
              <span>{t('create.field.author')}</span>
              <input
                type="text"
                required
                value={formState.author}
                onChange={(event) => handleChange('author', event.target.value)}
                placeholder={t('create.placeholder.author')}
              />
            </label>
            <label className="field">
              <span>{t('create.field.totalChapters')}</span>
              <input
                type="number"
                min={1}
                required
                value={formState.totalChapters}
                onChange={(event) =>
                  handleChange('totalChapters', Number(event.target.value))
                }
              />
            </label>
            <label className="field">
              <span>{t('create.field.totalPages')}</span>
              <input
                type="number"
                min={1}
                required
                value={formState.totalPages}
                onChange={(event) => handleChange('totalPages', Number(event.target.value))}
              />
            </label>
            <label className="field field-full">
              <span>{t('create.field.chapterList')}</span>
              <textarea
                value={formState.chapterList}
                onChange={(event) => handleChange('chapterList', event.target.value)}
                placeholder={t('create.placeholder.chapterList')}
                rows={4}
              />
            </label>
            <label className="field field-full">
              <span>{t('create.field.coverUrl')}</span>
              <input
                type="url"
                value={formState.coverUrl}
                onChange={(event) => handleChange('coverUrl', event.target.value)}
                placeholder={t('create.placeholder.coverUrl')}
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="button" type="submit" disabled={loading}>
            {loading ? t('create.button.creating') : t('create.button.create')}
          </button>
        </form>
      </section>
    </div>
  )
}
