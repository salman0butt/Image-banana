# Image's Banana

AI-assisted image editor built with Next.js, React, TypeScript, Zustand, TanStack Query, Supabase Auth/Storage, Sharp, and the OpenAI Responses / image-generation APIs.

## Architecture

The browser renders the editor with layered canvases so brush and selection interactions do not reprocess every pixel on every pointer event.

The primary image path is binary-first with durable persistence:

1. A selected image is previewed immediately from a local object URL.
2. The source is uploaded to `/api/upload-image` with `multipart/form-data`.
3. The server validates/decompresses it with Sharp, normalizes it to PNG, uploads it to the OpenAI Files API, persists the normalized PNG in the private Supabase `user-images` bucket, and records an `image_assets` row.
4. Image-edit requests send the owned source asset ID plus an optional binary PNG mask and optional binary image/PDF references.
5. Each edit creates a `generation_jobs` record before credit reservation so its model, prompt, credit cost, status, errors, and timestamps remain auditable.
6. Successful generated PNGs are returned as binary responses for the active editor while also being saved to private Supabase Storage and linked to the generation job.
7. Persistent history can reopen a saved output. Ownership is revalidated server-side; expired OpenAI edit references are refreshed from the private stored PNG, and the image bytes are streamed through the app so the canvas remains safe for drawing/masking.

Authentication uses Supabase Auth with SSR-compatible cookies. The root Next.js proxy refreshes sessions and protects application pages/API routes by default, while sensitive server endpoints verify the authenticated identity independently. User profile metadata is stored in `public.profiles` with Row Level Security so users can read/update only their own profile.

Generation billing is server-controlled:

1. The browser selects an allowlisted image preset and shows its credit cost.
2. `/api/edit-image` resolves that public preset ID to a trusted provider model/quality and cost.
3. Credits are atomically reserved through a service-role-only Supabase RPC before any OpenAI generation request.
4. Insufficient balances stop provider generation.
5. Failed or cancelled requests receive an idempotent refund linked to the original ledger charge.
6. Browser clients have read-only RLS access to their own wallet, ledger, image asset, and generation-job rows.

## Requirements

- Node.js 22+
- pnpm 10.15+
- Bun for the current unit-test runner
- A Supabase project
- An OpenAI API key

## Setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

Configure the required values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (defaults to `http://localhost:3000` in `.env.example`)
- `SUPABASE_SERVICE_ROLE_KEY` — server only; required for trusted credit and persistent-asset mutations and must never use a `NEXT_PUBLIC_` prefix
- `OPENAI_API_KEY`
- `SIGNUP_CREDITS` — optional; defaults to `25`

Apply the SQL migrations in `supabase/migrations` to the Supabase project in filename order. The generation-history slice is added by `20260824010000_generation_history.sql` after the auth/profile and credits migrations. Optional OpenAI output settings are documented in `.env.example`. Image model/quality selection is intentionally controlled by `lib/image-models.ts` so arbitrary client model IDs cannot bypass pricing rules.

If Supabase public configuration is missing, public auth pages remain renderable and auth actions return a clear configuration message instead of surfacing a raw server runtime error.

## Authentication

The current auth foundation includes:

- email/password registration and sign-in
- email verification callback support
- forgot-password and password-update flows
- sign-out
- protected `/account`
- authenticated `/api/auth/me`
- safe local redirect validation
- Supabase profile provisioning through an auth trigger
- RLS policies allowing users to select/update only their own profile

OAuth/social providers are not configured yet, but the Supabase Auth foundation supports adding them later without replacing the current session model.

## Persistent generation history

Successful and unsuccessful generation attempts are stored in `generation_jobs` with:

- prompt and server-controlled model ID
- generation credit cost
- source and output asset relationships
- `running`, `succeeded`, `failed`, or `cancelled` status
- safe error metadata
- created/completed timestamps

Source and generated PNG metadata lives in `image_assets`; private bytes live in Supabase Storage. The History panel shows recent jobs across browser sessions and allows successful outputs to be reopened for another edit. Reopening never trusts a client-provided storage path: the server loads the asset by authenticated user ownership and asset ID.

The current upload endpoint still proxies source image bytes through Next.js. Moving source uploads directly from the browser to signed Supabase Storage uploads is intentionally a later optimization slice.

## Validation

Run the same blocking checks used by CI:

```bash
pnpm audit --prod --audit-level=high
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The production dependency audit is the security gate because production runtime dependencies are what ship with the application. CI also runs the full `pnpm audit --audit-level=high`; both audits must pass. CI additionally provisions an isolated local Supabase stack, applies the real migrations, and runs authenticated Playwright flows for credits and persistent history.

## Security and resource controls

- Supabase Auth protects application pages and APIs by default.
- Sensitive server endpoints independently verify authenticated claims rather than trusting client state alone.
- `public.profiles`, `credit_wallets`, `credit_ledger`, `image_assets`, and `generation_jobs` use Row Level Security.
- Authenticated users have read-only access to their own persistent asset/history rows; browser roles cannot mutate those tables directly.
- The `user-images` Storage bucket is private, PNG-only, and has a 50 MB object limit.
- No ordinary authenticated `storage.objects` policy is granted; private image access is mediated by server-side ownership checks and short-lived signed URLs or same-origin streaming.
- Credit mutation RPCs are revoked from browser roles and executable only by `service_role`.
- Credit balances cannot become negative; generation charges use row locking and unique per-user idempotency keys.
- Profile creation is trigger-owned; no browser INSERT or DELETE policy is provided.
- Auth redirect targets are constrained to local application paths to prevent open redirects.
- Supabase configuration failures are surfaced as controlled auth/API errors rather than raw runtime overlays.
- Upload and edit endpoints validate declared request sizes and apply best-effort per-instance IP throttling.
- Source and reference images are decoded with a pixel limit before use.
- Edit masks must be PNGs with alpha and exactly match the owned source image dimensions.
- Reference files are limited to supported images and PDFs.
- OpenAI temporary mask/reference files are deleted after requests; durable source/generated provider references expire automatically and can be refreshed from private Storage.
- Responses use `store: false`.
- Browser object URLs are revoked when versions or attachments are discarded, and local undo history is bounded.
- AI requests are cancellable through `AbortController`.

### Production requirement: shared abuse controls

The included rate limiter is intentionally only a process-local safety net. Before exposing OpenAI-backed endpoints publicly at scale, add a shared quota/rate-limit layer (for example Redis or a platform gateway) so limits work across instances and users. Credit billing is persistent and server-controlled, but it does not replace infrastructure-level abuse protection.

## Deployment notes

### Vercel

The current source-upload endpoint still proxies image bytes through a Vercel Function. Vercel Function payload limits can therefore become a deployment constraint for large source images even though durable images are now stored in Supabase Storage.

A follow-up slice should move source uploads directly from the browser to signed Supabase Storage uploads, removing large source payloads from the Next.js Function path.

### Other Node hosting

On self-hosted/container Node deployments, also configure equivalent request limits, timeouts, TLS, shared rate limiting, logs/metrics, and upstream proxy limits. The application-level limits do not replace infrastructure controls.

## Current scope

Implemented in the current foundation:

- optimized drawing and binary image transport
- cancellable image-edit requests
- Supabase authentication/session refresh
- protected application routes and authenticated API identity checks
- user profiles with RLS
- server-controlled image presets
- credit wallet + ledger-style transaction history
- generation charging, insufficient-credit blocking, and idempotent refunds
- private persistent source/generated image assets in Supabase Storage
- persistent `generation_jobs` with status/errors/timestamps
- generation history UI with saved-output reopening

Still intentionally deferred to follow-up product slices: direct signed source uploads, payments, model/tool registry expansion, and production observability/shared rate limiting.
