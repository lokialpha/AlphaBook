# AlphaBook

AlphaBook is a community reading platform where people create public book sessions, join sessions, track reading progress, and discuss in a shared thread.

This repository currently contains:
- `web`: React + Vite web client
- `mobile`: Expo React Native mobile client
- `supabase.sql` + seed/policy SQL files for backend schema and RLS

## Project Spec vs Current Implementation

The product spec in `PROJECT_SPEC.md` defines **Web v1** as the initial target and marks mobile as out of scope for v1.

Current codebase status:
- Web app is implemented and functional for core flows.
- Mobile app is also implemented (beyond original v1 scope) with near-parity for major flows.
- Additional feature implemented: session PDF document uploads/previews.
- Feature in schema/spec but not implemented in UI yet: emoji reactions.
- Realtime subscriptions are noted in spec but currently not wired in app code.

## Feature Overview

### Implemented (Web + Mobile)
- Email/password auth with Supabase Auth
- Create public reading sessions
- Browse sessions list
- Join/leave sessions
- Post progress updates (chapter + page)
- View recent member progress
- Flat session discussion comments
- Delete own comments
- Profile management (display name + avatar upload)
- Session PDF document upload, preview, open, and owner delete
- English + Myanmar localization

### Implemented on Mobile only
- Theme preference (`system` / `light` / `dark`)
- Settings screen (language, appearance, account, app version)

### Not yet implemented in app UI
- Comment reactions (table and seed data exist)
- Realtime push updates (current behavior refreshes after write actions)

## Tech Stack

- Frontend Web: React 19, React Router, Vite, TypeScript
- Frontend Mobile: Expo, React Native, React Navigation, TypeScript
- Backend: Supabase (Postgres, Auth, Storage, RLS)
- Storage:
  - `session-pdfs` bucket (defined in `supabase.sql`)
  - `avatars` bucket (used by apps; create and policy-configure in Supabase)

## Repository Structure

```text
.
├── PROJECT_SPEC.md                  # Product spec (web v1 baseline)
├── supabase.sql                     # Main schema + RLS + storage setup
├── seed.sql                         # Optional seed data
├── comment_delete_policy.sql        # Standalone comment delete policy patch
├── web/
│   ├── src/
│   │   ├── App.tsx                  # Auth session bootstrap + routes
│   │   ├── pages/                   # Home, CreateSession, Session, Profile
│   │   ├── components/              # Header, AuthPanel, ProgressBar
│   │   ├── lib/                     # Supabase client, i18n provider, types
│   │   └── locales/                 # en/my translation dictionaries
│   └── package.json
└── mobile/
    ├── App.tsx                      # Providers + tab/stack navigation
    ├── src/
    │   ├── screens/                 # Home/Create/Session/Profile/Settings
    │   ├── components/              # AuthPanel, Avatar, ProgressBar
    │   ├── lib/                     # Supabase client, theme, i18n, nav types
    │   └── locales/                 # en/my translation dictionaries
    └── package.json
```

## Source Code Walkthrough

### Web app (`web/src`)
- `App.tsx`
  - Initializes Supabase auth session
  - Subscribes to auth state changes
  - Defines routes:
    - `/` -> `Home`
    - `/create` -> `CreateSession`
    - `/sessions/:id` -> `Session`
    - `/profile` -> `Profile`
- `pages/Home.tsx`
  - Shows hero + session list
  - Prompts sign-in when unauthenticated
- `pages/CreateSession.tsx`
  - Inserts into `books`, then `sessions`
- `pages/Session.tsx`
  - Loads session details + membership
  - Supports join/leave
  - Creates progress updates and comments
  - Supports owner-only comment deletion
  - Handles session PDF upload + open + owner delete
- `pages/Profile.tsx`
  - Reads/upserts `users` profile
  - Uploads avatar to `avatars` storage bucket
- `lib/i18n*.tsx` + `locales/*`
  - Locale persistence and translation lookup

### Mobile app (`mobile/src`)
- `App.tsx`
  - Loads fonts
  - Wraps app in `ThemeProvider` and `I18nProvider`
  - Configures bottom tabs + stack screens
- `screens/HomeScreen.tsx`
  - Session list and navigation
- `screens/CreateSessionScreen.tsx`
  - Create book + session flow
- `screens/SessionScreen.tsx`
  - Session details, membership, progress, comments, PDF documents
  - Document picker + inline preview (`WebView`) + external open
  - Incremental comment pagination (`See more`)
- `screens/ProfileScreen.tsx` + `ProfileEditScreen.tsx`
  - Profile display/edit, avatar upload via image picker
- `screens/SettingsScreen.tsx`
  - Language switching, appearance mode, account info
- `lib/theme.tsx`
  - Theme token system + preference persistence
- `lib/supabase.ts`
  - Supabase client configured with AsyncStorage session persistence

## Backend Model (Supabase)

Core tables in `supabase.sql`:
- `users`
- `books`
- `sessions`
- `session_members`
- `progress_updates`
- `comments`
- `session_documents`
- `reactions`

Also included:
- Trigger to auto-create `users` row when auth user is created
- Trigger to auto-add session creator as a session member
- RLS policies for each table
- Storage bucket/policies for `session-pdfs`

## Local Setup

## 1) Prerequisites
- Node.js `>=18`
- npm
- A Supabase project
- Expo tooling/device simulator for mobile development

## 2) Configure Supabase
1. Open Supabase SQL Editor and run `supabase.sql`.
2. (Optional) run `seed.sql` for sample data.
3. (Optional) `comment_delete_policy.sql` if you want to patch delete policy separately.
4. Ensure an `avatars` storage bucket exists and has suitable authenticated read/write policies (apps upload profile photos there).

## 3) Run Web app
```bash
cd web
npm install
```
Create `web/.env`:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Start:
```bash
npm run dev
```

## 4) Run Mobile app
```bash
cd mobile
npm install
cp .env.example .env
```
Set in `mobile/.env`:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Start:
```bash
npm run start
```
Useful variants:
```bash
npm run ios
npm run android
npm run android:emulator
npm run web
```

## Scripts

### Web (`web/package.json`)
- `npm run dev` - start Vite dev server
- `npm run build` - type-check + production build
- `npm run lint` - run ESLint
- `npm run preview` - preview production build

### Mobile (`mobile/package.json`)
- `npm run start` - start Expo dev server
- `npm run ios` - run iOS target
- `npm run android` - run Android target (localhost host mode)
- `npm run android:lan` - Android with LAN host
- `npm run android:tunnel` - Android with tunnel host
- `npm run android:emulator` - adb reverse + Android start
- `npm run web` - run Expo web target

## Notes
- Session and comment lists are refreshed after mutations; realtime subscriptions are not currently active in app code.
- Spec and implementation are close on core reading flows, but reactions remain backend-only for now.
