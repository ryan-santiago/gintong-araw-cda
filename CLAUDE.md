# Gintong Araw CDA — Member Management System

Specs live in `docs/` and are the source of truth. Read the relevant doc before building a module:
`docs/01-product-requirements.md` · `02-tech-stack.md` · `03-architecture.md` · `04-database-schema.md` · `05-roles-permissions.md` · `06-design-system.md` · `07-roadmap.md` · `08-deployment.md` · `09-user-guide.md` · `10-backup-restore.md`

## Stack

Next.js 16.4 (App Router, TS strict) · React 19.3 · Tailwind v4 · shadcn/ui · Prisma 7 + Neon Postgres · Better Auth · Cloudflare R2 · Vercel · pnpm

## Next.js 16 reminders

@AGENTS.md

- Installed: Next 16.4, React 19.3. Read `node_modules/next/dist/docs/` before using an API you are unsure of.
- **Cache Components is on** (`cacheComponents: true`). Reading `cookies()`/`headers()`/session outside a `<Suspense>` boundary is a build error, and a layout must not `await` the session at its top level. See `docs/01-app/02-guides/authentication-with-cache-components.md` in the Next docs.
- `proxy.ts`, not `middleware.ts`.
- `params`, `searchParams`, `cookies()`, `headers()` are async — always `await`.
- No `next lint`; run `pnpm lint` (ESLint CLI). `pnpm typecheck` runs `next typegen` first (for `LayoutProps`/`PageProps`).
- Prisma 7: `migrate dev` no longer runs `generate` — run `pnpm db:migrate --name <change>` then `pnpm db:generate`. Client is generated to `src/generated/prisma` (gitignored, `postinstall` regenerates). Import from `@/generated/prisma/client`; use the `db` client from `src/lib/db.ts`.
- shadcn uses the `radix-nova` style and the `cn` package (`@/lib/utils` re-exports it). Components in `src/components/ui` are ours to edit (card shadow, button sizes and the `ink` variant were customised).

## Auth & permissions (Phase 1)

- Server: `requireViewer()` (pages, inside Suspense) and `can(viewer, key)` from `src/lib/rbac.ts`; render `<NoAccess />` when a page permission is missing (`forbidden()` is canary-only).
- Mutations: `actionClient.metadata({ name, permission }).inputSchema(zod).action(...)` from `src/lib/safe-action.ts`; throw `ActionError` for user-facing errors; call `writeAudit(tx, …)` inside the transaction.
- Client: `useViewer()` / `useCan()` from `src/components/viewer-provider.tsx` (UI hints only).
- New permissions: add to `src/lib/permissions.ts`, then `pnpm db:seed`.

## Members (Phase 2)

- Member CRUD: `src/features/members/` (actions, queries, schema, components). Addresses are PSGC codes resolved to names on the server (`features/members/psgc.ts`); lists come from `/api/psgc`.
- Photos: `POST|DELETE /api/members/[id]/photo` (sharp → 600px + 128px WebP, EXIF stripped) stored in R2 under `members/{id}/`; read with `signedUrl()` from `src/lib/r2.ts` (hour-stable signatures so browsers cache).
- Export: `/api/members/export?format=xlsx|csv` with the list filters.
- Import: `/members/import` → `/api/members/import` (GET template; POST preview, `commit=1` inserts). Parsing/validation in `features/members/import.ts`; DB fields from `toMemberRecord()` (`features/members/record.ts`), shared with the create/update actions.
- Route handlers authorize with `apiViewer(permission)` from `src/lib/api.ts`.

## ID cards (Phase 3)

- `src/features/id-card/`: `layout.ts` (positions from the PSD), `render.ts` (sharp + opentype.js + qrcode + pdf-lib), `data.ts`, batch action + dialogs.
- Route: `/api/members/[id]/id-card`. QR text is the member's card link (`src/lib/card-link.ts`).
- Templates live in `src/features/id-card/assets/` — never in `public/` (signatures on the back). Keep asset paths literal in `render.ts`.
- Member photos are 3:4 portrait (600 × 800).
- Background removal (crop dialog): `src/features/members/lib/remove-background.ts`, MediaPipe `selfie_multiclass_256x256` in the browser. Model committed at `public/mediapipe/models/`; WASM engine copied to `public/mediapipe/wasm/` by `postinstall` (gitignored). `/mediapipe` is excluded from `proxy.ts`.

## Meetings & attendance (Phase 4)

- `src/features/meetings/` (CRUD, open/close, start today) and `src/features/attendance/` (capture actions, capture screen, member history, queries). Export: `/api/attendance/export`.
- Card QR = `<APP_URL>/m/<cardToken>` (`src/lib/card-link.ts`); public page `src/app/m/[token]` shows only safe fields (no phone/email/address/DOB). `APP_URL` must be final before printing cards.
- `pnpm build` runs `prisma generate` + `copy-vendor-wasm` before `next build` (Vercel can skip postinstall when it reuses cached node_modules).
- Self-hosted WASM: `scripts/copy-vendor-wasm.mjs` (postinstall and build) copies MediaPipe → `public/mediapipe/wasm` and zxing → `public/zxing`. Both are excluded from `proxy.ts`, git, lint and Prettier.
- If `prisma migrate dev` refuses to run non-interactively, generate SQL with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, save it as a new migration folder and run `prisma migrate deploy`.

## Dashboard & settings (Phase 5)

- Dashboard data: `src/features/dashboard/queries.ts`. At-risk rule: `src/features/attendance/at-risk.ts` (consecutive missed CLOSED meetings on/after the member's `createdAt`).
- Settings: one row per key in `setting`; read with `getAppSettings()` (defaults in `src/features/settings/schema.ts`), saved by `saveSettings` (`settings.manage`).
- With Cache Components, recently visited pages stay mounted but hidden (React Activity) — in browser tests, scope locators to visible content.

## Conventions

- Feature code goes in `src/features/<module>/` (`actions.ts`, `queries.ts`, `schema.ts`, `components/`).
- Every mutation is a `next-safe-action` action that: checks session → `requirePermission()` → Zod parse → `prisma.$transaction` with `writeAudit()` inside.
- Never rely on hidden UI for security; check permissions on the server.
- The app sends no email. Admins reset passwords (temporary password + forced change).
- Member required fields: firstName, lastName, trackingNumber (`YYYY-NNNN`, e.g. `2026-0001`, typed in by the user), blockNumber, lotNumber.
- Members are soft-deleted (`isActive=false`, `deletedAt`); never hard-delete members.
- Store times in UTC; display in `Asia/Manila` via `src/lib/dates.ts`.
- Use the design tokens (`bg-card`, `text-muted-foreground`, `bg-primary`…). No raw hex in components. Gold is never text on light backgrounds.
- Photos: private R2 bucket, signed URLs only. Generated ID cards are streamed as downloads and never stored.
- Dates of meetings are `@db.Date` (Manila calendar day) — use `dayToDate`/`dateToDay`/`formatDay` from `src/lib/dates.ts`.

## Commands

- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm format`
- `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:seed:psgc` · `pnpm db:studio` · `pnpm icons`
- `pnpm test` runs Vitest unit tests in `tests/unit` (pure logic only; `server-only` is aliased to a stub, mock `@/env`/`@/lib/db` when needed).
- Login redirects go through `safeRedirectPath()` (`src/lib/safe-redirect.ts`). Security headers + CSP live in `next.config.ts`; add any new external origin there.
