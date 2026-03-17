# AlphaBook – Project Spec (Web v1)

## Summary
AlphaBook is a web-first community reading platform where anyone can register, create a reading session for a single book, and track progress with others. Each session has one flat discussion thread and emoji reactions. Sessions are public in v1. Progress is shown with chapter and page-based progress bars. The first release targets web only.

## Goals
- Enable quick creation of a reading session for a single book.
- Let members join sessions, track progress by chapter and page, and discuss in a shared thread.
- Provide clear, consistent progress visibility to all members in a session.

## Non-Goals for v1
- Mobile apps (iOS/Android) are out of scope until after web is complete.
- Notifications are out of scope.
- Search is out of scope.
- Comment editing is out of scope.
- Extra permissions for session hosts are out of scope.

## Target Platforms
- Web app only in v1.
- Mobile apps planned after web completion.

## Authentication
- Supabase Auth with email and password in v1.
- OAuth providers (including Google) are planned for v2.

## Core Concepts
- A reading session is tied to exactly one book.
- Sessions are public in v1.
- Discussion is a single, flat thread per session.
- Members can react with multiple emojis to any comment.
- Progress is visible to all session members.

## User Roles
- Guest: Can see marketing/landing and sign in with email/password.
- Member: Authenticated user. Can create sessions, join sessions, post progress updates, comment, and react.
- Session creator has no extra permissions beyond a regular member in v1.

## Functional Requirements

**Sessions**
- Create a public session with book details.
- Public sessions are visible in a public sessions list for authenticated users.
- Session details are immutable after creation in v1.

**Membership**
- Users can join public sessions directly.
- Users can leave a session.

**Books**
- Required fields: title, author, total chapters, total pages.
- Optional fields: chapter list, cover image.

**Progress Tracking**
- Members submit progress updates with chapter number and page number.
- Latest progress per member is shown as:
- Chapter progress bar: chapter_number / total_chapters
- Page progress bar: page_number / total_pages
- Progress updates are visible to all session members.
- Validation prevents chapter_number and page_number from exceeding totals.

**Discussion**
- Single flat thread per session.
- Members can post comments.
- Members can react with multiple emojis to any comment.
- No comment editing or deletion in v1.

## UX Flows

**Create Session**
1. User signs in with email/password.
2. User enters book details.
3. Session is created and the user becomes a regular member.

**Join Public Session**
1. User signs in with email/password.
2. User browses public sessions list.
3. User joins a session.

**Post Progress**
1. User selects chapter number and page number.
2. User submits progress update.
3. Session displays updated progress bars for the user.

**Discuss**
1. User posts a comment.
2. Other members react with emoji.

## Data Model (Supabase Postgres)

**users**
- id (uuid, pk, from auth)
- display_name
- avatar_url
- created_at

**books**
- id (uuid, pk)
- title
- author
- total_chapters (int)
- total_pages (int)
- chapter_list (jsonb, optional)
- cover_url (optional)
- created_at

**sessions**
- id (uuid, pk)
- book_id (fk)
- created_by (fk to users)
- created_at

**session_members**
- id (uuid, pk)
- session_id (fk)
- user_id (fk)
- joined_at

**progress_updates**
- id (uuid, pk)
- session_id (fk)
- user_id (fk)
- chapter_number (int)
- page_number (int)
- created_at

**comments**
- id (uuid, pk)
- session_id (fk)
- user_id (fk)
- body (text)
- created_at

**reactions**
- id (uuid, pk)
- comment_id (fk)
- user_id (fk)
- emoji (text)
- created_at

## Permissions (Supabase RLS)
- Users can read their own user profile and public profiles of other members.
- Members can read sessions they belong to.
- Public sessions list is readable by all authenticated users.
- Members can create and read comments, reactions, and progress updates in sessions they belong to.
- Members can create their own session membership for public sessions.
- Members can leave sessions by deleting their own membership.

## Realtime
- Realtime subscriptions for session comments, reactions, and progress updates.
- No notifications in v1.

## Supabase Setup (Current)
- Project URL: `https://scunbddtjloqtgpyrnjj.supabase.co`
- Publishable (anon) key is stored in `web/.env` as `VITE_SUPABASE_ANON_KEY`.
- The URL is stored in `web/.env` as `VITE_SUPABASE_URL`.
- Supabase schema and RLS policies are defined in `supabase.sql`.
- Seed data for local testing is defined in `seed.sql`.

## Web App Screens
- Landing page
- Email/password sign-in
- Public sessions list
- Session detail view
- Create session form
- User profile

## Out of Scope for v1
- Mobile apps
- Notifications
- Search
- Comment edit or delete
- Session editing after creation
- Private sessions
- Role-based moderation

## Post-v1 Considerations
- iOS/Android apps with shared API and auth.
- Session editing and moderation roles.
- Private sessions with invites.
- Notifications and reminders.
- Search and filters.
- Progress history views and analytics.
