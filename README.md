# Social Butterflie

A modern, dark, Netlify-hosted social scheduler with:
- Instagram/FB (via Meta Graph) posting
- YouTube upload & scheduling
- TikTok placeholder (requires app approval)
- Frame.io media browser
- AI captions & hashtag packs (OpenAI)
- Netlify Scheduled Functions to auto-post

> **Status:** This is a working starter. Configure environment vars and Supabase to go live.

## 🧭 Prerequisites

- Node.js 18+ and npm
- Netlify CLI (`npm i -g netlify-cli`)
- Supabase account (free tier is fine)
- Provider accounts for Frame.io, Meta (Facebook/Instagram), Google (YouTube), TikTok, and optionally OpenAI

## 🚀 Local development

```pwsh
Expand-Archive pixl-social.zip
Set-Location pixl-social
npm install
netlify dev
```

The app is intentionally static (no client build step). Styling is centralized in `public/theme.css`; JavaScript lives in the `js/` directory and is ES module friendly (served directly). FullCalendar and Font Awesome are pulled from CDNs for zero-build velocity. If you later introduce a bundler (Vite/ESBuild) you can tree‑shake and self-host.

### Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Run Netlify dev server (functions + static) |
| `npm run build` | No-op placeholder (Netlify handles functions) |
| `npm run format` | Format sources with Prettier |

Add a lint step easily:

```pwsh
npm i -D eslint
npx eslint --init
```

Then wire: `"lint": "eslint ."`.

The Netlify dev server proxies functions and mimics the production routing (including Netlify Scheduled Functions).

### Environment variables (local + Netlify)

Add these in Netlify → Site settings → Environment, and mirror them in a local `.env` (Netlify CLI will load it automatically):

| Group | Key | Notes |
| --- | --- | --- |
| **Supabase** | `SUPABASE_URL` | Supabase project URL (Project Settings → API). |
|  | `SUPABASE_SERVICE_ROLE` | Service role key (keep secret; used by Netlify Functions). |
| **Frame.io** | `FRAMEIO_TOKEN` | Personal Access Token with project/asset read scopes. |
| **Meta (FB/IG)** | `FB_APP_ID` | From Facebook App dashboard. |
|  | `FB_APP_SECRET` | App secret. |
|  | `FB_REDIRECT_URI` | Match value in `.env.example`; register in Facebook Login settings. |
| **YouTube** | `GOOGLE_CLIENT_ID` | OAuth client (Web) in Google Cloud Console. |
|  | `GOOGLE_CLIENT_SECRET` | Matching client secret. |
|  | `GOOGLE_REDIRECT_URI` | Same redirect URL configured in Google Cloud. |
| **TikTok** | `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | From TikTok Developer portal. |
|  | `TIKTOK_REDIRECT_URI` | Listed in app settings. |
| **AI (optional)** | `OPENAI_API_KEY` | Enables caption + hashtag generators. |
|  | `OPENAI_MODEL` | Override default model (defaults to `gpt-5` placeholder). |
| **Misc** | `SITE_URL` (optional) | Your production domain (used in redirects if different from Netlify default). |

Copy values from `.env.example` for the expected keys/redirects.

## 🗄️ Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor** → paste `sql/schema.sql` from this repo → run it once. This provisions tables, storage, and policies used by the scheduler.
3. Grab `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` from **Project settings → API**. Store them securely in Netlify + local `.env`.
4. (Optional) Enable Storage and link a bucket if you want to offload uploads; the starter uses Supabase PostgreSQL by default.

## 🔌 Provider configuration

### Frame.io
- Navigate to [Frame.io Developer settings](https://developer.frame.io/)
- Create a **Personal Access Token** with read permissions.
- Save it to `FRAMEIO_TOKEN`.
- In the app, visit **Settings → Frame.io** to browse projects/assets. Selecting an asset will prefill its media URL for scheduling.

### Meta (Facebook & Instagram)
- Create a Facebook App (type: Business) and enable **Facebook Login**.
- Add the Instagram Graph API and Facebook Page permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_manage_metadata`, `pages_manage_posts`.
- Configure the OAuth redirect URL to `FB_REDIRECT_URI` (see `.env.example`).
- Link an Instagram Business or Creator account to a Facebook Page. Personal profiles cannot auto-post.
- After user login, the app exchanges for long-lived tokens, finds the connected Page, and retrieves the IG Business Account ID to post media containers at schedule time.

### YouTube
- In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID (type **Web application**).
- Add the redirect URL from `.env.example` to `Authorized redirect URIs`.
- Save the client ID/secret to `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the redirect to `GOOGLE_REDIRECT_URI`.
- Videos upload as `privacyStatus: "private"` with `status.publishAt` set for scheduled publish. For larger files, upgrade to resumable uploads (see TODO comments in `shared/connectors/youtube.js`).

### TikTok
- Register an app at [TikTok for Developers](https://developers.tiktok.com/).
- Apply for **Content Posting API** access with `video.upload` and `video.publish` scopes.
- Configure the redirect URL to match `TIKTOK_REDIRECT_URI`.
- Enter `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`. Until the app is approved, TikTok will return authorization errors—the code handles the Direct Post init flow once approval is granted.

### AI captioning (optional)
- Create an [OpenAI](https://platform.openai.com/) API key and set `OPENAI_API_KEY`.
- Optionally override the model via `OPENAI_MODEL` to match your account (e.g., `gpt-4.1-mini`).

## 📦 Deploy to Netlify

1. Push to your Git provider or drag-and-drop the repo folder in Netlify.
2. In Netlify Site settings, replicate the environment variables listed above.
3. Deploy. Netlify Scheduled Functions defined in `netlify/functions/` will automatically register:
   - `scheduler` — runs every 5 minutes to post due content (see `netlify.toml`).
   - `refresh_tokens` — runs daily to refresh OAuth tokens.
4. Monitor function logs in Netlify for any provider errors.

## 🔁 Posting flow overview

| Network | Auth flow | Scheduling behavior | Notes |
| --- | --- | --- | --- |
| Instagram | Facebook Login → exchange long-lived token → resolve Page → IG Business ID | Supabase stores publish time; `scheduler` Netlify Function creates media container then publishes | Requires Business/Creator account linked to Page. Photos/video supported via Graph API. |
| Facebook Page | Facebook Login → Page token | Uses `scheduled_publish_time` + `published=false` on `/photos` or `/feed` | Token needs `pages_manage_posts`. |
| YouTube | Google OAuth (offline access) | Uploads as private with `status.publishAt` | Ensure `privacyStatus="private"` until publish time. |
| TikTok | TikTok OAuth | Direct Post API init (pending approval) | Requires Content Posting API approval; stub included. |

## ⚠️ Gotchas

- Netlify function filesystem is ephemeral—persistent data lives in Supabase.
- Instagram auto-posting does **not** support personal profiles.
- TikTok responses will fail until your app is approved for Direct Post.
- Ensure redirect URLs in provider consoles exactly match the values supplied in env vars.
- For large YouTube uploads, use resumable uploads (commented TODO in the connector).

## 🎨 UI / Architecture Notes

- The initial HTML had nested `<html>` documents and ad-hoc Tailwind utility overrides breaking consistency; this has been rebuilt so each page (`index.html`, `analytics.html`, `settings.html`) now shares a single glass / panel system from `theme.css`.
- `:root` variable block defines color tokens, glass borders, radii, transitions, and gradients—avoid scattering inline colors to keep future theming simple (e.g., add light theme by swapping variable map).
- FullCalendar theming lives in the same stylesheet with prefixed selectors (`.fc ...`). If you introduce additional calendar instances, they inherit automatically; to scope, wrap in a container class.
- All AI modal logic and calendar operations are in `js/app.js`. Consider splitting into modules if file growth continues (e.g., `ai.js`, `calendar.js`, `frameio.js`).
- Netlify Functions act as a thin BFF (Backend For Frontend) over Supabase + external APIs; they intentionally avoid heavy validation layers for iteration speed. Introduce Zod/Yup if contracts start drifting.

## 🧪 Future Hardening

- Add integration tests (e.g., Playwright) to verify scheduling + AI flows.
- Introduce rate limiting / simple auth (user login) before multi-user rollout.
- Cache Frame.io project lists (Netlify Edge / Deno KV) if latency becomes noticeable.
- Add per-post status change webhooks (e.g. Slack) for failures beyond retry policy.

## 🛣️ Suggested enhancements

- Role-based users and multi-brand workspaces (e.g., add `org_id` column).
- Per-platform profile selectors (multiple FB Pages / YouTube channels).
- Media preprocessing (aspect ratio/duration validation before scheduling).
- Retry + dead-letter queues for failed posts (with optional Slack alerts).
