# SocialButterflie Rebuild App

This folder contains the sequential rebuild implementation target for:

1. `Rebuild Plans/PLAN 1.md`
2. `Rebuild Plans/PLAN 2.md`
3. `Rebuild Plans/PLAN 3.md`

## Stack
- Next.js App Router + TypeScript
- Tailwind v4 tokens in `src/app/globals.css`
- Firebase Auth + Firestore + Firebase Storage (with mock fallback when env is missing)

## Run
```bash
npm install
npm run dev
```

## Firebase Team Testing Setup (Auth + Firestore + Storage)
1. In Firebase Console -> Authentication -> Sign-in method:
   - Enable `Email/Password`
   - Enable OAuth providers you want to support (`Google`, `Microsoft`, `GitHub`, `Apple`)
2. In Authentication -> Settings -> Authorized domains:
   - Add your Netlify domain(s) used for testing.
3. Set all keys from `.env.example` in local `.env.local` and in Netlify environment variables.
4. Deploy the included Firestore/Storage rules:
```bash
npx firebase-tools login
npx firebase-tools use <your-firebase-project-id>
npx firebase-tools deploy --only firestore:rules,storage
```
5. For invite links, set `NEXT_PUBLIC_APP_URL` to your live app URL (for example `https://socialbutterflie.studio`).

## Social OAuth Connector Setup
The integrations screen is wired to Netlify functions for real social OAuth begin/disconnect flows.
Set these Netlify environment variables for live connector auth:
- `FB_APP_ID`
- `FB_APP_SECRET`
- `FB_REDIRECT_URI` (for `/.netlify/functions/auth?provider=facebook&action=callback` and `provider=instagram`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (for `provider=youtube`)
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI`

Current connector status:
- Wired now: Instagram (Meta), Facebook Pages, YouTube, TikTok.
- Planned next: LinkedIn, Stories/Reels publish pipelines, per-platform content adapters.
- Company scope:
  - Integrations are isolated per company (`/companies/[companyId]/integrations`).
  - OAuth connects are tagged to that company and listing is filtered by company id.

## Routes Implemented
- Core shell/pages: `/dashboard`, `/build`, `/calendar`, `/review`, `/analytics`, `/settings`, `/assets`
- Company module: `/companies`, `/companies/[companyId]`, `/companies/[companyId]/intake`
- AI Studio: `/studio`, `/studio/library`, `/studio/jobs/[jobId]`

## API Endpoints Implemented
- `/api/context/session`
- `/api/inspector/entity`
- `/api/search`
- `/api/assets`
- `/api/companies` (+ detail/patch, versions, context compile)
- `/api/studio/jobs` (+ detail, cancel, route destination)
- `/api/usage/ai` and `/api/usage/ai/consume`

## Notes
- If Firebase server credentials are not present, repository functions use in-memory demo data.
- Team invite workflow:
  - Admin sends invite by email in Company Selector or Company Members page.
  - App writes invite + member role in Firestore.
  - Use `Copy link` and send the URL to the invited tester.
  - Invited tester signs in with that same email and opens the invite link to join.
- Permission model:
  - Role index is stored at `workspaces/{workspaceId}/user_roles/{uid}`.
  - `admin`: manage companies, members, invites, and workspace data.
  - `editor`: edit company/workspace content.
  - `viewer` / `client`: read-only access.
- Governance files are tracked in `Rebuild Plans/`:
  - `MASTER_CONTEXT.md`
  - `DECISION_LOG.md`
  - `PHASE_STATUS.md`

