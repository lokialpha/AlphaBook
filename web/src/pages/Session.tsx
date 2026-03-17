import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Comment, ProgressUpdate, Session, SessionDocument } from '../lib/types'
import ProgressBar from '../components/ProgressBar'
import AuthPanel from '../components/AuthPanel'
import { useI18n } from '../lib/useI18n'

const DOCUMENT_BUCKET = 'session-pdfs'
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

type SessionPageProps = {
  user: User | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function SessionPage({
  user,
  onSignIn,
  onSignUp,
}: SessionPageProps) {
  const { t } = useI18n()
  const { id } = useParams()
  const [session, setSession] = useState<Session | null>(null)
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [membershipMessage, setMembershipMessage] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [commentMessage, setCommentMessage] = useState<string | null>(null)
  const [documents, setDocuments] = useState<SessionDocument[]>([])
  const [documentMessage, setDocumentMessage] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null)

  const [chapterNumber, setChapterNumber] = useState(1)
  const [pageNumber, setPageNumber] = useState(1)
  const [commentBody, setCommentBody] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const latestUserProgress = useMemo(() => {
    if (!user) return null
    const userUpdates = progressUpdates
      .filter((update) => update.user?.id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return userUpdates[0] ?? null
  }, [progressUpdates, user])

  const mapDocumentRows = useCallback((rows: SessionDocument[]) => {
    return rows.map((row) => {
      const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(row.file_path)
      return {
        ...row,
        file_url: data.publicUrl,
      }
    })
  }, [])

  const formatDocumentTimestamp = useCallback(
    (createdAt: string) => {
      const parsed = new Date(createdAt)
      if (Number.isNaN(parsed.getTime())) return t('session.comment.recently')
      return parsed.toLocaleString()
    },
    [t]
  )

  useEffect(() => {
    let active = true

    const fetchSession = async () => {
      if (!id || !user) return
      setLoading(true)
      setMembershipLoading(true)

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(
          `id,
           created_at,
           created_by,
           book:books (id, title, author, total_chapters, total_pages, cover_url)`
        )
        .eq('id', id)
        .single()

      if (!active) return

      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        setMembershipLoading(false)
        return
      }

      setSession(sessionData as unknown as Session)

      const { data: membershipData } = await supabase
        .from('session_members')
        .select('id')
        .eq('session_id', id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return

      const member = !!membershipData
      setIsMember(member)
      setMembershipLoading(false)

      if (member) {
        const [{ data: progressData }, { data: commentsData }, { data: documentsData }] =
          await Promise.all([
            supabase
              .from('progress_updates')
              .select(
                `id, created_at, chapter_number, page_number, user:users (id, display_name, avatar_url)`
              )
              .eq('session_id', id)
              .order('created_at', { ascending: false }),
            supabase
              .from('comments')
              .select(
                `id, created_at, body, user_id, user:users (id, display_name, avatar_url)`
              )
              .eq('session_id', id)
              .order('created_at', { ascending: true }),
            supabase
              .from('session_documents')
              .select(
                `id, created_at, session_id, uploaded_by, file_name, file_path, user:users (id, display_name, avatar_url)`
              )
              .eq('session_id', id)
              .order('created_at', { ascending: false }),
          ])

        if (!active) return

        const safeProgress = (progressData as unknown as ProgressUpdate[]) || []
        setProgressUpdates(safeProgress)
        const safeComments = (commentsData as unknown as Comment[]) || []
        setComments(safeComments)
        const safeDocuments = (documentsData as unknown as SessionDocument[]) || []
        setDocuments(mapDocumentRows(safeDocuments))

        const latestForUser = safeProgress.find((update) => update.user?.id === user.id)
        if (latestForUser) {
          setChapterNumber(latestForUser.chapter_number)
          setPageNumber(latestForUser.page_number)
        }
      } else {
        setProgressUpdates([])
        setComments([])
        setDocuments([])
      }
      setError(null)
      setLoading(false)
    }

    fetchSession()

    return () => {
      active = false
    }
  }, [id, mapDocumentRows, user])

  const refreshActivity = async (sessionId: string) => {
    const [{ data: progressData }, { data: commentsData }, { data: documentsData }] =
      await Promise.all([
        supabase
          .from('progress_updates')
          .select(
            `id, created_at, chapter_number, page_number, user:users (id, display_name, avatar_url)`
          )
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false }),
        supabase
          .from('comments')
          .select(`id, created_at, body, user_id, user:users (id, display_name, avatar_url)`)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true }),
        supabase
          .from('session_documents')
          .select(
            `id, created_at, session_id, uploaded_by, file_name, file_path, user:users (id, display_name, avatar_url)`
          )
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false }),
      ])

    setProgressUpdates((progressData as unknown as ProgressUpdate[]) || [])
    const safeComments = (commentsData as unknown as Comment[]) || []
    setComments(safeComments)
    const safeDocuments = (documentsData as unknown as SessionDocument[]) || []
    setDocuments(mapDocumentRows(safeDocuments))
  }

  const handleJoin = async () => {
    if (!user || !session) return
    setMembershipLoading(true)
    setMembershipMessage(null)
    const { error: joinError } = await supabase.from('session_members').insert({
      session_id: session.id,
      user_id: user.id,
    })

    if (joinError) {
      setMembershipMessage(joinError.message)
    } else {
      setIsMember(true)
      setMembershipMessage(t('session.message.joined'))
      await refreshActivity(session.id)
    }
    setMembershipLoading(false)
  }

  const handleLeave = async () => {
    if (!user || !session) return
    setMembershipLoading(true)
    setMembershipMessage(null)
    const { error: leaveError } = await supabase
      .from('session_members')
      .delete()
      .eq('session_id', session.id)
      .eq('user_id', user.id)

    if (leaveError) {
      setMembershipMessage(leaveError.message)
    } else {
      setIsMember(false)
      setProgressUpdates([])
      setComments([])
      setDocuments([])
      setMembershipMessage(t('session.message.left'))
    }
    setMembershipLoading(false)
  }

  const handleProgressSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !session) return
    if (!isMember) {
      setProgressMessage(t('session.progress.error.mustJoin'))
      return
    }

    const maxChapters = session.book?.total_chapters ?? 0
    const maxPages = session.book?.total_pages ?? 0

    if (chapterNumber < 1 || chapterNumber > maxChapters) {
      setProgressMessage(t('session.progress.error.chapterRange'))
      return
    }
    if (pageNumber < 1 || pageNumber > maxPages) {
      setProgressMessage(t('session.progress.error.pageRange'))
      return
    }

    setSubmitting(true)
    setProgressMessage(null)

    const { error: insertError } = await supabase.from('progress_updates').insert({
      session_id: session.id,
      user_id: user.id,
      chapter_number: Number(chapterNumber),
      page_number: Number(pageNumber),
    })

    if (!insertError) {
      await refreshActivity(session.id)
    } else {
      setProgressMessage(insertError.message)
    }

    setSubmitting(false)
  }

  const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !session || !commentBody.trim()) return
    if (!isMember) {
      setCommentMessage(t('session.comment.error.mustJoin'))
      return
    }

    setSubmitting(true)
    setCommentMessage(null)

    const { error: insertError } = await supabase.from('comments').insert({
      session_id: session.id,
      user_id: user.id,
      body: commentBody.trim(),
    })

    if (!insertError) {
      await refreshActivity(session.id)
      setCommentBody('')
    } else {
      setCommentMessage(insertError.message)
    }

    setSubmitting(false)
  }

  const handleCommentDelete = async (commentId: string) => {
    if (!user || !session) return
    if (!isMember) {
      setCommentMessage(t('session.comment.error.mustJoin'))
      return
    }

    const selectedComment = comments.find((comment) => comment.id === commentId)
    if (selectedComment?.user_id !== user.id) return

    setDeletingCommentId(commentId)
    setCommentMessage(null)

    const { data: deletedRows, error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .select('id')

    if (deleteError) {
      setCommentMessage(deleteError.message)
      window.alert(deleteError.message)
      setDeletingCommentId(null)
      return
    }

    if (!deletedRows || deletedRows.length === 0) {
      const failedMessage = t('session.comment.error.deleteFailed')
      setCommentMessage(failedMessage)
      window.alert(failedMessage)
      setDeletingCommentId(null)
      return
    }

    await refreshActivity(session.id)
    setDeletingCommentId(null)
  }

  const requestCommentDelete = (commentId: string) => {
    if (!user || deletingCommentId) return
    const selectedComment = comments.find((comment) => comment.id === commentId)
    if (selectedComment?.user_id !== user.id) return

    const confirmed = window.confirm(
      `${t('session.comment.deleteConfirmTitle')}\n\n${t('session.comment.deleteConfirmMessage')}`
    )
    if (!confirmed) return

    void handleCommentDelete(commentId)
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !session) return

    setDocumentMessage(null)
    setDocumentError(null)

    if (!isMember) {
      setDocumentError(t('session.documents.error.mustJoin'))
      event.target.value = ''
      return
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setDocumentError(t('session.documents.error.fileType'))
      event.target.value = ''
      return
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setDocumentError(t('session.documents.error.fileSize'))
      event.target.value = ''
      return
    }

    const baseName = file.name.replace(/\.pdf$/i, '').trim()
    const slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filePath = `${session.id}/${user.id}/${Date.now()}-${slug || 'document'}.pdf`

    setUploadingDocument(true)

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      setDocumentError(uploadError.message || t('session.documents.error.upload'))
      setUploadingDocument(false)
      event.target.value = ''
      return
    }

    const { error: insertError } = await supabase.from('session_documents').insert({
      session_id: session.id,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
    })

    if (insertError) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath])
      setDocumentError(insertError.message || t('session.documents.error.save'))
      setUploadingDocument(false)
      event.target.value = ''
      return
    }

    await refreshActivity(session.id)
    setDocumentMessage(t('session.documents.message.uploaded'))
    setUploadingDocument(false)
    event.target.value = ''
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!user || !session) return
    if (!isMember) {
      setDocumentError(t('session.documents.error.mustJoin'))
      return
    }

    const targetDocument = documents.find((document) => document.id === documentId)
    if (!targetDocument || targetDocument.uploaded_by !== user.id) return

    setDeletingDocumentId(documentId)
    setDocumentMessage(null)
    setDocumentError(null)

    const { data: deletedDocument, error: deleteError } = await supabase
      .from('session_documents')
      .delete()
      .eq('id', documentId)
      .eq('session_id', session.id)
      .eq('uploaded_by', user.id)
      .select('file_path')
      .maybeSingle()

    if (deleteError || !deletedDocument) {
      setDocumentError(deleteError?.message ?? t('session.documents.error.delete'))
      setDeletingDocumentId(null)
      return
    }

    let storageDeleteError: string | null = null
    if (deletedDocument.file_path) {
      const { error: storageError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove([deletedDocument.file_path])
      if (storageError) {
        storageDeleteError = storageError.message
      }
    }

    await refreshActivity(session.id)
    setDeletingDocumentId(null)

    if (storageDeleteError) {
      setDocumentError(storageDeleteError)
      return
    }

    setDocumentMessage(t('session.documents.message.deleted'))
  }

  const requestDocumentDelete = (documentId: string) => {
    if (!user || deletingDocumentId) return
    const targetDocument = documents.find((document) => document.id === documentId)
    if (!targetDocument || targetDocument.uploaded_by !== user.id) return

    const confirmed = window.confirm(
      `${t('session.documents.deleteConfirmTitle')}\n\n${t('session.documents.deleteConfirmMessage')}`
    )
    if (!confirmed) return

    void handleDocumentDelete(documentId)
  }

  if (!user) {
    return (
      <div className="page">
        <section className="section narrow">
          <AuthPanel
            title={t('session.auth.title')}
            subtitle={t('session.auth.subtitle')}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
          />
        </section>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">{t('session.loading')}</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="page">
        <div className="empty-state">
          {error ?? t('session.notFound')} <Link to="/">{t('session.back')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="session-hero">
        <div>
          <p className="eyebrow">{t('session.eyebrow')}</p>
          <h1>{session.book?.title ?? t('home.session.untitled')}</h1>
          <p className="hero-subtitle">
            {session.book?.author ?? t('home.session.unknownAuthor')}
          </p>
        </div>
        <div className="session-meta-card">
          <p>{t('session.meta.chapters', { count: session.book?.total_chapters ?? 0 })}</p>
          <p>{t('session.meta.pages', { count: session.book?.total_pages ?? 0 })}</p>
          <p>{t('session.meta.public')}</p>
          <div className="session-actions">
            {isMember ? (
              <button
                className="button button-ghost"
                onClick={handleLeave}
                disabled={membershipLoading}
              >
                {membershipLoading ? t('session.action.leaving') : t('session.action.leave')}
              </button>
            ) : (
              <button className="button" onClick={handleJoin} disabled={membershipLoading}>
                {membershipLoading ? t('session.action.joining') : t('session.action.join')}
              </button>
            )}
          </div>
          {membershipMessage ? (
            <p className="form-note">{membershipMessage}</p>
          ) : null}
        </div>
      </section>

      {!isMember ? (
        <section className="section">
          <div className="empty-state">
            {t('session.message.joinToView')}
          </div>
        </section>
      ) : null}

      <section className="section grid-two">
        <div className="panel">
          <h2>{t('session.progress.title')}</h2>
          <p className="section-subtitle">{t('session.progress.subtitle')}</p>

          {!isMember ? (
            <div className="empty-state">{t('session.progress.joinToTrack')}</div>
          ) : (
            <form className="form" onSubmit={handleProgressSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>{t('session.progress.field.chapter')}</span>
                  <input
                    type="number"
                    min={1}
                    max={session.book?.total_chapters ?? undefined}
                    value={chapterNumber}
                    onChange={(event) => setChapterNumber(Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>{t('session.progress.field.page')}</span>
                  <input
                    type="number"
                    min={1}
                    max={session.book?.total_pages ?? undefined}
                    value={pageNumber}
                    onChange={(event) => setPageNumber(Number(event.target.value))}
                  />
                </label>
              </div>
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? t('session.progress.saving') : t('session.progress.save')}
              </button>
            </form>
          )}
          {progressMessage ? <p className="form-error">{progressMessage}</p> : null}

          {isMember ? (
            <div className="progress-stack">
              <ProgressBar
                label={t('session.progress.latestChapter')}
                value={latestUserProgress?.chapter_number ?? 0}
                total={session.book?.total_chapters ?? 0}
                tone="sage"
              />
              <ProgressBar
                label={t('session.progress.latestPage')}
                value={latestUserProgress?.page_number ?? 0}
                total={session.book?.total_pages ?? 0}
                tone="peach"
              />
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h2>{t('session.recent.title')}</h2>
          <p className="section-subtitle">{t('session.recent.subtitle')}</p>
          <div className="timeline">
            {!isMember ? (
              <p className="empty-state">{t('session.recent.joinToView')}</p>
            ) : progressUpdates.length === 0 ? (
              <p className="empty-state">{t('session.recent.empty')}</p>
            ) : (
              progressUpdates.slice(0, 6).map((update) => (
                <div key={update.id} className="timeline-item">
                  <div>
                    <p className="timeline-title">
                      {update.user?.display_name ?? t('common.reader')}
                    </p>
                    <p className="timeline-subtitle">
                      {t('session.progress.field.chapter')} {update.chapter_number} ·{' '}
                      {t('session.progress.field.page')} {update.page_number}
                    </p>
                  </div>
                  <span className="timeline-badge">{t('session.recent.badge')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('session.documents.title')}</h2>
            <p className="section-subtitle">{t('session.documents.subtitle')}</p>
          </div>
        </div>

        {!isMember ? (
          <p className="empty-state">{t('session.documents.joinToView')}</p>
        ) : (
          <>
            <div className="form">
              <label className="field field-full">
                <span>{t('session.documents.uploadLabel')}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDocument}
                />
              </label>
              <p className="form-note">{t('session.documents.fileLimit')}</p>
              {uploadingDocument ? (
                <p className="form-note">{t('session.documents.uploading')}</p>
              ) : null}
            </div>
            {documentError ? <p className="form-error">{documentError}</p> : null}
            {documentMessage ? <p className="form-note">{documentMessage}</p> : null}

            {documents.length === 0 ? (
              <p className="empty-state">{t('session.documents.empty')}</p>
            ) : (
              <div className="document-grid">
                {documents.map((document) => {
                  const uploaderName = document.user?.display_name ?? t('common.reader')
                  const isDeletingDocument = deletingDocumentId === document.id

                  return (
                    <article key={document.id} className="document-card">
                      <a
                        href={document.file_url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="document-thumbnail-link"
                      >
                        <div className="document-thumbnail" aria-hidden="true">
                          {document.file_url ? (
                            <iframe
                              src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
                              title={document.file_name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="document-thumbnail-fallback">PDF</div>
                          )}
                        </div>
                      </a>

                      <div className="document-content">
                        <p className="document-name" title={document.file_name}>
                          {document.file_name}
                        </p>
                        <p className="document-meta">
                          {t('session.documents.uploadedBy', { name: uploaderName })}
                        </p>
                        <p className="document-meta">
                          {t('session.documents.uploadedOn', {
                            date: formatDocumentTimestamp(document.created_at),
                          })}
                        </p>

                        <div className="document-actions">
                          <a
                            href={document.file_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="button button-ghost document-open"
                          >
                            {t('session.documents.open')}
                          </a>
                          {document.uploaded_by === user.id ? (
                            <button
                              type="button"
                              className="button button-ghost document-delete"
                              onClick={() => requestDocumentDelete(document.id)}
                              disabled={isDeletingDocument}
                            >
                              {isDeletingDocument
                                ? t('session.documents.deleting')
                                : t('session.documents.delete')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('session.discussion.title')}</h2>
            <p className="section-subtitle">{t('session.discussion.subtitle')}</p>
          </div>
        </div>

        <div className="discussion">
          {!isMember ? (
            <p className="empty-state">{t('session.discussion.joinToView')}</p>
          ) : comments.length === 0 ? (
            <p className="empty-state">{t('session.discussion.empty')}</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <p className="comment-author">
                    {comment.user?.display_name ?? t('common.reader')}
                  </p>
                  <div className="comment-header-actions">
                    <p className="comment-time">{t('session.comment.recently')}</p>
                    {comment.user_id === user.id ? (
                      <button
                        type="button"
                        className="comment-delete-button"
                        onClick={() => requestCommentDelete(comment.id)}
                        disabled={deletingCommentId === comment.id}
                        aria-label={t('session.comment.delete')}
                        title={t('session.comment.delete')}
                      >
                        <span className="comment-delete-icon" aria-hidden="true">
                          🗑
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="comment-body">{comment.body}</p>
              </div>
            ))
          )}
        </div>

        {isMember ? (
          <form className="form" onSubmit={handleCommentSubmit}>
            <label className="field field-full">
              <span>{t('session.comment.addLabel')}</span>
              <textarea
                rows={3}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder={t('session.comment.placeholder')}
              />
            </label>
            {commentMessage ? <p className="form-error">{commentMessage}</p> : null}
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? t('session.comment.posting') : t('session.comment.post')}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  )
}
