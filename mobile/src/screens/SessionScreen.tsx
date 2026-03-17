import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { WebView } from 'react-native-webview'
import type { User } from '@supabase/supabase-js'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import type { Comment, ProgressUpdate, Session, SessionDocument } from '../lib/types'
import { RootStackParamList } from '../lib/navigation'
import { useI18n } from '../lib/i18n'
import { useTheme, type Theme } from '../lib/theme'
import AuthPanel from '../components/AuthPanel'
import ProgressBar from '../components/ProgressBar'
import Avatar from '../components/Avatar'

const INITIAL_VISIBLE_COMMENTS = 4
const COMMENTS_BATCH_SIZE = 4
const DOCUMENT_BUCKET = 'session-pdfs'
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

type SessionScreenProps = NativeStackScreenProps<RootStackParamList, 'Session'> & {
  user: User | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function SessionScreen({
  route,
  user,
  onSignIn,
  onSignUp,
}: SessionScreenProps) {
  const { t, locale } = useI18n()
  const theme = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { id } = route.params
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

  const [chapterNumber, setChapterNumber] = useState('1')
  const [pageNumber, setPageNumber] = useState('1')
  const [commentBody, setCommentBody] = useState('')
  const [visibleCommentCount, setVisibleCommentCount] = useState(INITIAL_VISIBLE_COMMENTS)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const latestUserProgress = useMemo(() => {
    if (!user) return null
    const userUpdates = progressUpdates
      .filter((update) => update.user?.id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return userUpdates[0] ?? null
  }, [progressUpdates, user])

  const visibleComments = useMemo(
    () => comments.slice(0, visibleCommentCount),
    [comments, visibleCommentCount]
  )
  const hasMoreComments = comments.length > visibleCommentCount

  useEffect(() => {
    setVisibleCommentCount(INITIAL_VISIBLE_COMMENTS)
  }, [id])

  useEffect(() => {
    setVisibleCommentCount((current) =>
      Math.max(INITIAL_VISIBLE_COMMENTS, Math.min(current, comments.length))
    )
  }, [comments.length])

  const formatCommentTime = useCallback(
    (createdAt: string) => {
      const parsed = new Date(createdAt)
      if (Number.isNaN(parsed.getTime())) return t('session.comment.recently')
      return new Intl.DateTimeFormat(locale === 'my' ? 'my-MM' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(parsed)
    },
    [locale, t]
  )

  const mapDocumentRows = useCallback((rows: SessionDocument[]) => {
    return rows.map((row) => {
      const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(row.file_path)
      return {
        ...row,
        file_url: data.publicUrl,
      }
    })
  }, [])

  const formatDocumentTime = useCallback(
    (createdAt: string) => {
      const parsed = new Date(createdAt)
      if (Number.isNaN(parsed.getTime())) return t('session.comment.recently')
      return new Intl.DateTimeFormat(locale === 'my' ? 'my-MM' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(parsed)
    },
    [locale, t]
  )

  const getDocumentPreviewUrl = useCallback((fileUrl?: string) => {
    if (!fileUrl) return null
    if (Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`
    }
    return `${fileUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`
  }, [])

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
              .order('created_at', { ascending: false }),
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
          setChapterNumber(String(latestForUser.chapter_number))
          setPageNumber(String(latestForUser.page_number))
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
          .order('created_at', { ascending: false }),
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

  const handleProgressSubmit = async () => {
    if (!user || !session) return
    if (!isMember) {
      setProgressMessage(t('session.progress.error.mustJoin'))
      return
    }

    const maxChapters = session.book?.total_chapters ?? 0
    const maxPages = session.book?.total_pages ?? 0
    const chapterValue = Number(chapterNumber)
    const pageValue = Number(pageNumber)

    if (chapterValue < 1 || chapterValue > maxChapters) {
      setProgressMessage(t('session.progress.error.chapterRange'))
      return
    }
    if (pageValue < 1 || pageValue > maxPages) {
      setProgressMessage(t('session.progress.error.pageRange'))
      return
    }

    setSubmitting(true)
    setProgressMessage(null)

    const { error: insertError } = await supabase.from('progress_updates').insert({
      session_id: session.id,
      user_id: user.id,
      chapter_number: chapterValue,
      page_number: pageValue,
    })

    if (!insertError) {
      await refreshActivity(session.id)
    } else {
      setProgressMessage(insertError.message)
    }

    setSubmitting(false)
  }

  const handleCommentSubmit = async () => {
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
      Alert.alert(t('session.comment.delete'), deleteError.message)
      setDeletingCommentId(null)
      return
    }

    if (!deletedRows || deletedRows.length === 0) {
      const failedMessage = t('session.comment.error.deleteFailed')
      setCommentMessage(failedMessage)
      Alert.alert(t('session.comment.delete'), failedMessage)
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

    Alert.alert(t('session.comment.deleteConfirmTitle'), t('session.comment.deleteConfirmMessage'), [
      {
        text: t('session.comment.cancel'),
        style: 'cancel',
      },
      {
        text: t('session.comment.delete'),
        style: 'destructive',
        onPress: () => {
          void handleCommentDelete(commentId)
        },
      },
    ])
  }

  const handlePickDocument = async () => {
    if (!user || !session) return
    setDocumentMessage(null)
    setDocumentError(null)

    if (!isMember) {
      setDocumentError(t('session.documents.error.mustJoin'))
      return
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    })

    if (result.canceled) return

    const selectedAsset = result.assets?.[0]
    if (!selectedAsset?.uri) {
      setDocumentError(t('session.documents.error.read'))
      return
    }

    if (selectedAsset.size && selectedAsset.size > MAX_DOCUMENT_SIZE) {
      setDocumentError(t('session.documents.error.fileSize'))
      return
    }

    const baseName = selectedAsset.name.replace(/\.pdf$/i, '').trim()
    const slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filePath = `${session.id}/${user.id}/${Date.now()}-${slug || 'document'}.pdf`

    setUploadingDocument(true)

    try {
      const base64File = await FileSystem.readAsStringAsync(selectedAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const fileData = decode(base64File)

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(filePath, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        })

      if (uploadError) {
        setDocumentError(uploadError.message || t('session.documents.error.upload'))
        return
      }

      const { error: insertError } = await supabase.from('session_documents').insert({
        session_id: session.id,
        uploaded_by: user.id,
        file_name: selectedAsset.name,
        file_path: filePath,
      })

      if (insertError) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath])
        setDocumentError(insertError.message || t('session.documents.error.save'))
        return
      }

      await refreshActivity(session.id)
      setDocumentMessage(t('session.documents.message.uploaded'))
    } catch {
      setDocumentError(t('session.documents.error.read'))
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleOpenDocument = async (fileUrl?: string) => {
    if (!fileUrl) return
    const supported = await Linking.canOpenURL(fileUrl)
    if (!supported) {
      setDocumentError(t('session.documents.error.open'))
      return
    }
    await Linking.openURL(fileUrl)
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!user || !session) return
    if (!isMember) {
      setDocumentError(t('session.documents.error.mustJoin'))
      return
    }

    const selectedDocument = documents.find((document) => document.id === documentId)
    if (!selectedDocument || selectedDocument.uploaded_by !== user.id) return

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
    const selectedDocument = documents.find((document) => document.id === documentId)
    if (!selectedDocument || selectedDocument.uploaded_by !== user.id) return

    Alert.alert(
      t('session.documents.deleteConfirmTitle'),
      t('session.documents.deleteConfirmMessage'),
      [
        {
          text: t('session.comment.cancel'),
          style: 'cancel',
        },
        {
          text: t('session.documents.delete'),
          style: 'destructive',
          onPress: () => {
            void handleDocumentDelete(documentId)
          },
        },
      ]
    )
  }

  const handleSeeMoreComments = () => {
    setVisibleCommentCount((current) => current + COMMENTS_BATCH_SIZE)
  }

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AuthPanel
          title={t('session.auth.title')}
          subtitle={t('session.auth.subtitle')}
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

  if (error || !session) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>{error ?? t('session.notFound')}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.sessionHero}>
        <View>
          <Text style={styles.eyebrow}>{t('session.eyebrow')}</Text>
          <Text style={styles.title}>
            {session.book?.title ?? t('home.session.untitled')}
          </Text>
          <Text style={styles.subtitle}>
            {session.book?.author ?? t('home.session.unknownAuthor')}
          </Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaText}>
            {t('session.meta.chapters', { count: session.book?.total_chapters ?? 0 })}
          </Text>
          <Text style={styles.metaText}>
            {t('session.meta.pages', { count: session.book?.total_pages ?? 0 })}
          </Text>
          <Text style={styles.metaText}>{t('session.meta.public')}</Text>
          <View style={styles.sessionActions}>
            {isMember ? (
              <Pressable
                style={[styles.buttonGhost, membershipLoading ? styles.buttonDisabled : null]}
                onPress={handleLeave}
                disabled={membershipLoading}
              >
                <Text style={styles.buttonGhostText}>
                  {membershipLoading ? t('session.action.leaving') : t('session.action.leave')}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.button, membershipLoading ? styles.buttonDisabled : null]}
                onPress={handleJoin}
                disabled={membershipLoading}
              >
                <Text style={styles.buttonText}>
                  {membershipLoading ? t('session.action.joining') : t('session.action.join')}
                </Text>
              </Pressable>
            )}
          </View>
          {membershipMessage ? <Text style={styles.note}>{membershipMessage}</Text> : null}
        </View>
      </View>

      {!isMember ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('session.message.joinToView')}</Text>
        </View>
      ) : null}

      <View style={styles.gridTwo}>
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t('session.progress.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('session.progress.subtitle')}</Text>

          {!isMember ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('session.progress.joinToTrack')}</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>{t('session.progress.field.chapter')}</Text>
                  <TextInput
                    style={styles.input}
                    value={chapterNumber}
                    onChangeText={setChapterNumber}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>{t('session.progress.field.page')}</Text>
                  <TextInput
                    style={styles.input}
                    value={pageNumber}
                    onChangeText={setPageNumber}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Pressable
                style={[styles.button, submitting ? styles.buttonDisabled : null]}
                onPress={handleProgressSubmit}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? t('session.progress.saving') : t('session.progress.save')}
                </Text>
              </Pressable>
            </View>
          )}
          {progressMessage ? <Text style={styles.error}>{progressMessage}</Text> : null}

          {isMember ? (
            <View style={styles.progressStack}>
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
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t('session.recent.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('session.recent.subtitle')}</Text>
          <View style={styles.timeline}>
            {!isMember ? (
              <Text style={styles.emptyText}>{t('session.recent.joinToView')}</Text>
            ) : progressUpdates.length === 0 ? (
              <Text style={styles.emptyText}>{t('session.recent.empty')}</Text>
            ) : (
              progressUpdates.slice(0, 6).map((update) => (
                <View key={update.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <Avatar
                      size={36}
                      uri={update.user?.avatar_url}
                      label={update.user?.display_name ?? t('common.reader')}
                    />
                    <View>
                      <Text style={styles.timelineTitle}>
                        {update.user?.display_name ?? t('common.reader')}
                      </Text>
                      <Text style={styles.timelineSubtitle}>
                        {t('session.recent.item', {
                          chapter: update.chapter_number,
                          page: update.page_number,
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timelineBadge}>{t('session.recent.badge')}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('session.documents.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('session.documents.subtitle')}</Text>

        {!isMember ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('session.documents.joinToView')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.form}>
              <Pressable
                style={[styles.buttonGhost, uploadingDocument ? styles.buttonDisabled : null]}
                onPress={handlePickDocument}
                disabled={uploadingDocument}
              >
                <Text style={styles.buttonGhostText}>
                  {uploadingDocument
                    ? t('session.documents.uploading')
                    : t('session.documents.uploadLabel')}
                </Text>
              </Pressable>
              <Text style={styles.note}>{t('session.documents.fileLimit')}</Text>
              {documentError ? <Text style={styles.error}>{documentError}</Text> : null}
              {documentMessage ? <Text style={styles.note}>{documentMessage}</Text> : null}
            </View>

            {documents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t('session.documents.empty')}</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.documentList}
              >
                {documents.map((document) => {
                  const uploaderName = document.user?.display_name ?? t('common.reader')
                  const isDeletingDocument = deletingDocumentId === document.id
                  const previewUrl = getDocumentPreviewUrl(document.file_url)

                  return (
                    <View key={document.id} style={styles.documentCard}>
                      <View style={styles.documentThumbnail}>
                        {previewUrl ? (
                          <View style={styles.documentPreviewWrapper} pointerEvents="none">
                            <WebView
                              source={{ uri: previewUrl }}
                              originWhitelist={['*']}
                              style={styles.documentPreview}
                              scrollEnabled={false}
                              javaScriptEnabled
                              domStorageEnabled
                            />
                          </View>
                        ) : (
                          <Text style={styles.documentThumbnailText}>PDF</Text>
                        )}
                      </View>
                      <View style={styles.documentContent}>
                        <Text style={styles.documentName} numberOfLines={2}>
                          {document.file_name}
                        </Text>
                        <Text style={styles.documentMeta}>
                          {t('session.documents.uploadedBy', { name: uploaderName })}
                        </Text>
                        <Text style={styles.documentMeta}>
                          {t('session.documents.uploadedOn', {
                            date: formatDocumentTime(document.created_at),
                          })}
                        </Text>
                        <View style={styles.documentActions}>
                          <Pressable
                            style={styles.documentAction}
                            onPress={() => {
                              void handleOpenDocument(document.file_url)
                            }}
                          >
                            <Text style={styles.documentActionText}>{t('session.documents.open')}</Text>
                          </Pressable>
                          {document.uploaded_by === user.id ? (
                            <Pressable
                              style={[
                                styles.documentAction,
                                styles.documentDeleteAction,
                                isDeletingDocument ? styles.buttonDisabled : null,
                              ]}
                              onPress={() => requestDocumentDelete(document.id)}
                              disabled={isDeletingDocument}
                            >
                              <Text style={styles.documentDeleteActionText}>
                                {isDeletingDocument
                                  ? t('session.documents.deleting')
                                  : t('session.documents.delete')}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('session.discussion.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('session.discussion.subtitle')}</Text>

        <View style={styles.discussion}>
          {!isMember ? (
            <Text style={styles.emptyText}>{t('session.discussion.joinToView')}</Text>
          ) : comments.length === 0 ? (
            <Text style={styles.emptyText}>{t('session.discussion.empty')}</Text>
          ) : (
            visibleComments.map((comment) => {
              const canDeleteComment = comment.user_id === user.id
              const isDeletingComment = deletingCommentId === comment.id

              return (
                <View key={comment.id} style={styles.comment}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthor}>
                      <Avatar
                        size={32}
                        uri={comment.user?.avatar_url}
                        label={comment.user?.display_name ?? t('common.reader')}
                      />
                      <Text style={styles.commentAuthorName}>
                        {comment.user?.display_name ?? t('common.reader')}
                      </Text>
                    </View>
                    <View style={styles.commentHeaderRight}>
                      <Text style={styles.commentTime}>{formatCommentTime(comment.created_at)}</Text>
                      {canDeleteComment ? (
                        <Pressable
                          style={[
                            styles.commentDeleteButton,
                            isDeletingComment ? styles.commentDeleteButtonDisabled : null,
                          ]}
                          onPress={() => requestCommentDelete(comment.id)}
                          disabled={isDeletingComment}
                          accessibilityRole="button"
                          accessibilityLabel={t('session.comment.delete')}
                        >
                          <Text style={styles.commentDeleteButtonIcon}>🗑</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                </View>
              )
            })
          )}
          {isMember && hasMoreComments ? (
            <Pressable style={styles.seeMoreButton} onPress={handleSeeMoreComments}>
              <Text style={styles.seeMoreButtonText}>
                {t('session.discussion.seeMore', {
                  count: comments.length - visibleCommentCount,
                })}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isMember ? (
          <View style={styles.form}>
            <Text style={styles.label}>{t('session.comment.addLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder={t('session.comment.placeholder')}
              placeholderTextColor={theme.colors.muted}
              multiline
            />
            {commentMessage ? <Text style={styles.error}>{commentMessage}</Text> : null}
            <Pressable
              style={[styles.button, submitting ? styles.buttonDisabled : null]}
              onPress={handleCommentSubmit}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? t('session.comment.posting') : t('session.comment.post')}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
      gap: spacing.xl,
    },
    loading: {
      flex: 1,
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    error: {
      color: colors.danger,
      fontFamily: fonts.bodySemi,
    },
    eyebrow: {
      textTransform: 'uppercase',
      letterSpacing: 2,
      fontSize: 12,
      fontFamily: fonts.bodySemi,
      color: colors.muted,
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
    sessionHero: {
      gap: spacing.md,
    },
    metaCard: {
      backgroundColor: colors.paper,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaText: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    sessionActions: {
      marginTop: spacing.sm,
    },
    note: {
      marginTop: spacing.sm,
      color: colors.muted,
      fontFamily: fonts.body,
    },
    emptyState: {
      backgroundColor: colors.overlay,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    gridTwo: {
      gap: spacing.lg,
    },
    panel: {
      backgroundColor: colors.paper,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
      gap: spacing.sm,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.ink,
    },
    sectionSubtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    form: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    fieldHalf: {
      flex: 1,
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
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
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
    progressStack: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    timeline: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    timelineItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.stone,
      padding: spacing.sm,
      borderRadius: 12,
    },
    timelineLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    timelineTitle: {
      fontFamily: fonts.bodySemi,
      color: colors.ink,
    },
    timelineSubtitle: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    timelineBadge: {
      fontFamily: fonts.body,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.muted,
    },
    documentList: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    documentCard: {
      width: 220,
      backgroundColor: colors.paper,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    documentThumbnail: {
      height: 120,
      backgroundColor: colors.stone,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    documentPreviewWrapper: {
      ...StyleSheet.absoluteFillObject,
    },
    documentPreview: {
      flex: 1,
      backgroundColor: colors.stone,
    },
    documentThumbnailText: {
      fontFamily: fonts.bodySemi,
      color: colors.indigo,
      letterSpacing: 1,
      fontSize: 18,
    },
    documentContent: {
      padding: spacing.sm,
      gap: 4,
    },
    documentName: {
      fontFamily: fonts.bodySemi,
      color: colors.ink,
    },
    documentMeta: {
      fontFamily: fonts.body,
      color: colors.muted,
      fontSize: 12,
    },
    documentActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    documentAction: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.overlay,
    },
    documentActionText: {
      fontFamily: fonts.bodySemi,
      color: colors.indigo,
      fontSize: 12,
    },
    documentDeleteAction: {
      borderColor: colors.danger,
      backgroundColor: colors.paper,
    },
    documentDeleteActionText: {
      fontFamily: fonts.bodySemi,
      color: colors.danger,
      fontSize: 12,
    },
    discussion: {
      gap: spacing.md,
    },
    comment: {
      backgroundColor: colors.paper,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    commentAuthor: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    commentAuthorName: {
      fontFamily: fonts.bodySemi,
      color: colors.ink,
    },
    commentTime: {
      fontFamily: fonts.body,
      color: colors.muted,
    },
    commentHeaderRight: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    commentDeleteButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor: colors.overlay,
    },
    commentDeleteButtonDisabled: {
      opacity: 0.6,
    },
    commentDeleteButtonIcon: {
      fontSize: 13,
      color: colors.muted,
    },
    commentBody: {
      fontFamily: fonts.body,
      color: colors.ink,
    },
    seeMoreButton: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.overlay,
    },
    seeMoreButtonText: {
      fontFamily: fonts.bodySemi,
      color: colors.indigo,
    },
  })
}
