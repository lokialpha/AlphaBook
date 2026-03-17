export type Book = {
  id: string
  title: string
  author: string
  total_chapters: number
  total_pages: number
  chapter_list?: string[] | null
  cover_url?: string | null
}

export type Session = {
  id: string
  created_at: string
  created_by?: string | null
  book?: Book | null
}

export type SessionDocument = {
  id: string
  created_at: string
  session_id: string
  uploaded_by: string
  file_name: string
  file_path: string
  file_url?: string
  user?: Profile | null
}

export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

export type ProgressUpdate = {
  id: string
  created_at: string
  chapter_number: number
  page_number: number
  user?: Profile | null
}

export type Comment = {
  id: string
  created_at: string
  body: string
  user_id?: string
  user?: Profile | null
}

export type Reaction = {
  id: string
  created_at: string
  emoji: string
  comment_id: string
  user_id: string
}
