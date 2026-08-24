# Image's Banana

AI-assisted image editor built with Next.js, React, TypeScript, Zustand, TanStack Query, Supabase Auth, Sharp, and the OpenAI Responses / image-generation APIs.

## Architecture

The browser renders the editor with layered canvases so brush and selection interactions do not reprocess every pixel on every pointer event.

The primary image path is binary-first:

1. A selected image is previewed immediately from a local object URL.
2. The source is uploaded to `/api/upload-image` with `multipart/form-data`.
3. The server validates/decompresses it with Sharp, normalizes it to PNG, uploads it to the OpenAI Files API, and returns a signed, expiring image reference.
4. Image-edit requests send that small signed reference plus an optional binary PNG mask and optional binary image/PDF references.
5. The generated image is returned as binary PNG and receives its own signed file reference so history versions remain editable.

The signed reference prevents clients from substituting arbitrary OpenAI file IDs and also carries trusted source dimensions for mask validation.

Authentication uses Supabase Auth with SSR-compatible cookies. The root Next.js proxy refreshes sessions and protects application pages/API routes by default, while sensitive server endpoints verify the authenticated identity independently. User profile metadata is stored in `public.profiles` with Row Level Security so users can read/update only their own profile.

Generation billing is server-controlled:

1. The browser selects an allowlisted image preset and shows its credit cost.
2. `/api/edit-image` resolves that public preset ID to a trusted provider model/quality and cost.
3. Credits are atomically reserved through a service-role-only Supabase RPC before any OpenAI request.
4. Insufficient balances stop the provider request.
5. Failed or cancelled requests receive an idempotent refund linked to the original ledger charge.
6. Browser clients have read-only RLS access to their own wallet and ledger rows.

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
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` — server-only Supabase admin key; set one for trusted credit mutations and never use a `NEXT_PUBLIC_` prefix
- `OPENAI_API_KEY`
- `SIGNUP_CREDITS` — optional; defaults to `25`

Apply the SQL migrations in `supabase/migrations` to the Supabase project in filename order. Optional OpenAI output settings are documented in `.env.example`. Image model/quality selection is intentionally controlled by `lib/image-models.ts` so arbitrary client model IDs cannot bypass pricing rules.

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

## Validation

Run the same blocking checks used by CI:

```bash
pnpm audit --prod --audit-level=high
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The production dependency audit is the security gate because production runtime dependencies are what ship with the application. CI also runs the full `pnpm audit --audit-level=high`; both audits must pass. If future advisories appear in direct or transitive dependencies, remediate them with a compatible package update or an exact pnpm override rather than weakening either audit gate.

## Security and resource controls

- Supabase Auth protects application pages and APIs by default.
- Sensitive server endpoints independently verify authenticated claims rather than trusting client state alone.
- `public.profiles`, `credit_wallets`, and `credit_ledger` use Row Level Security.
- Users can read only their own wallet/ledger rows; browser roles cannot mutate credit state directly.
- Credit mutation RPCs are revoked from browser roles and executable only by `service_role`.
- Credit balances cannot become negative; generation charges use row locking and unique per-user idempotency keys.
- Profile creation is trigger-owned; no browser INSERT or DELETE policy is provided.
- Auth redirect targets are constrained to local application paths to prevent open redirects.
- Supabase configuration failures are surfaced as controlled auth/API errors rather than raw runtime overlays.
- Upload and edit endpoints validate declared request sizes and apply best-effort per-instance IP throttling.
- Source and reference images are decoded with a pixel limit before use.
- Edit masks must be PNGs with alpha and exactly match the signed source dimensions.
- Reference files are limited to supported images and PDFs.
- OpenAI temporary mask/reference files are deleted after requests; source/generated files expire automatically.
- Responses use `store: false`.
- Browser object URLs are revoked when versions or attachments are discarded, and image history is bounded.
- AI requests are cancellable through `AbortController`.

### Production requirement: shared abuse controls

The included rate limiter is intentionally only a process-local safety net. Before exposing OpenAI-backed endpoints publicly at scale, add a shared quota/rate-limit layer (for example Redis or a platform gateway) so limits work across instances and users. Credit billing is persistent and server-controlled, but it does not replace infrastructure-level abuse protection.

## Deployment notes

### Vercel

Do not deploy the current large-image transport to Vercel Functions unchanged if you intend to support images larger than the platform Function payload limit. Vercel currently limits Function request and response bodies to 4.5 MB.

For production large-image support on Vercel, upload source/reference images directly from the browser to object storage (for example Supabase Storage, Vercel Blob, or S3-compatible storage) and return generated images through object storage/CDN URLs rather than proxying large image bytes through a Function.

Until that storage path is implemented, treat the Vercel large-file deployment path as a known production limitation.

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

Still intentionally deferred to follow-up product slices: payments, durable Supabase Storage assets, persistent generation history/jobs, model/tool registry expansion, and production observability/shared rate limiting.
