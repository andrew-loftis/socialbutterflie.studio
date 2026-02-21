# SocialButterflie "On Steroids" Blueprint

## Product Interaction Model

Target shell pattern:
- Left rail navigation
- Command bar for global search/actions
- Dense card grid for operational work
- Right-side inspector for object details

Inspector object types:
- Post
- Asset
- Campaign
- Automation
- Report

Inspector panels should always show:
- Version history
- Approval status
- Audit log

Current implementation status:
- Dashboard now includes command bar + right inspector.
- Posts, campaigns, accounts, and insights open inspector context.
- Inspector includes summary, version list, approvals, and audit trail placeholders.

## Pricing and Packaging Model

Use a hybrid model: per-seat base + usage-based overages.

Cost drivers to model explicitly:
1. Social API and automation execution
2. Media pipeline costs (storage, CDN egress, processing/renditions)
3. AI and analytics compute (LLM calls, summarization, warehousing)

Recommended plan design:
- `Starter`: limited profiles, lower automation volume, capped AI credits
- `Growth`: more profiles/seats, higher job throughput, scheduled reporting
- `Scale`: advanced automations, higher API limits, governance/audit controls

Variable-cost policy:
- X integration should be metered separately due to platform pay-per-usage economics.

## Frontend Target Architecture (Next.js)

Target stack:
- Next.js App Router + TypeScript
- Tailwind + shadcn
- Lucide
- Minimal Framer Motion
- CSS variable tokens
- 8px spacing system
- `/playground` for state coverage and safe AI edits

Route strategy:
- `(marketing)` group for website pages
- `(app)` group for authenticated product surfaces
- `(playground)` group for component and AI-sandbox states

App routes:
- `/calendar`
- `/build`
- `/assets`
- `/analytics`
- `/inbox`
- `/automations`
- `/settings`
- `/playground`

Modal/inspector strategy:
- Use parallel + intercepting routes for deep-linkable inspector modals.

Data strategy:
- Cache + revalidate read-heavy views (`analytics`, report listings).

## Suggested Folder Structure

```txt
app/
  (marketing)/page.tsx
  (app)/
    layout.tsx
    dashboard/page.tsx
    calendar/page.tsx
    calendar/@modal/(.)post/[postId]/page.tsx
    build/page.tsx
    assets/page.tsx
    assets/@modal/(.)asset/[assetId]/page.tsx
    analytics/page.tsx
    analytics/reports/page.tsx
    analytics/reports/[reportId]/page.tsx
    inbox/page.tsx
    automations/page.tsx
    automations/[automationId]/page.tsx
    settings/page.tsx
  (playground)/
    layout.tsx
    page.tsx
    components/cards/page.tsx
    components/forms/page.tsx
    components/tables/page.tsx
    ai/page.tsx
components/
  ui/
  app/
  icons/
lib/
  api/
  auth/
  flags/
  telemetry/
  utils.ts
styles/
  globals.css
```

## Design Token Rules

Core rules:
- Semantic token names only (`--background`, `--foreground`, `--primary`, etc.)
- 8px spacing baseline (`4/8/12/16/24/32...`)
- Shared radius/elevation scale across cards/dialogs/inputs
- One token source of truth in `globals.css`

## Execution Priorities

1. Keep densified shell and inspector behavior consistent on every product page.
2. Promote inspector to shared component across calendar/assets/analytics.
3. Add real version/approval/audit data from backend entities.
4. Migrate to Next.js App Router using route groups and modal intercepts.
