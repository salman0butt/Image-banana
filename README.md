# Image's Banana

AI-assisted image editor built with Next.js, React, TypeScript, Zustand, Sharp, and the OpenAI Responses / image-generation APIs.

## Architecture

The browser renders the editor with layered canvases so brush and selection interactions do not reprocess every pixel on every pointer event.

The primary image path is binary-first:

1. A selected image is previewed immediately from a local object URL.
2. The source is uploaded to `/api/upload-image` with `multipart/form-data`.
3. The server validates/decompresses it with Sharp, normalizes it to PNG, uploads it to the OpenAI Files API, and returns a signed, expiring image reference.
4. Image-edit requests send that small signed reference plus an optional binary PNG mask and optional binary image/PDF references.
5. The generated image is returned as binary PNG and receives its own signed file reference so history versions remain editable.

The signed reference prevents clients from substituting arbitrary OpenAI file IDs and also carries trusted source dimensions for mask validation.

## Requirements

- Node.js 22+
- pnpm 10.15+
- Bun for the current unit-test runner
- An OpenAI API key

## Setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

Set `OPENAI_API_KEY` in `.env.local`. Optional model/output settings are documented in `.env.example`.

## Validation

Run the same checks used by CI:

```bash
pnpm audit --audit-level=high
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The pull-request CI runs with a frozen pnpm lockfile and read-only repository permissions.

## Security and resource controls

- Upload and edit endpoints validate declared request sizes and apply best-effort per-instance IP throttling.
- Source and reference images are decoded with a pixel limit before use.
- Edit masks must be PNGs with alpha and exactly match the signed source dimensions.
- Reference files are limited to supported images and PDFs.
- OpenAI temporary mask/reference files are deleted after requests; source/generated files expire automatically.
- Responses use `store: false`.
- Browser object URLs are revoked when versions or attachments are discarded, and image history is bounded.
- AI requests are cancellable through `AbortController`.

### Production requirement: shared abuse controls

The included rate limiter is intentionally only a process-local safety net. Before exposing OpenAI-backed endpoints publicly at scale, add authentication plus a shared quota/rate-limit layer (for example Redis or a platform gateway) so limits work across instances and users. Do not rely on the in-memory limiter as the billing/security boundary.

## Deployment notes

### Vercel

Do not deploy the current large-image transport to Vercel Functions unchanged if you intend to support images larger than the platform Function payload limit. Vercel currently limits Function request and response bodies to 4.5 MB.

For production large-image support on Vercel, upload source/reference images directly from the browser to object storage (for example Vercel Blob or S3-compatible storage) and return generated images through object storage/CDN URLs rather than proxying large image bytes through a Function.

Until that storage path is implemented, treat the Vercel large-file deployment path as a known production limitation.

### Other Node hosting

On self-hosted/container Node deployments, also configure equivalent request limits, timeouts, TLS, shared rate limiting, logs/metrics, and upstream proxy limits. The application-level limits do not replace infrastructure controls.

## Current scope

The repository currently has no authentication, user database, billing/credit ledger, or durable application database. Those are product-level requirements before this becomes a public multi-user SaaS rather than a protected/demo editor.
