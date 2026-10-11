# 03 — Architecture

## 1. Folder structure

```
gintong-araw-app/
├─ docs/                          # these specs
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/                       # permissions, default groups, super admin, PSGC
├─ prisma.config.ts
├─ public/
│  ├─ brand/logo.png
│  ├─ id-template/front.png       # ID template (user supplied)
│  ├─ id-template/back.png        # optional
│  └─ sounds/scan-ok.mp3, scan-error.mp3
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, register, change-password
│  │  ├─ (app)/                   # authenticated shell (sidebar + topbar)
│  │  │  ├─ dashboard/
│  │  │  ├─ members/              # list, new, [id], [id]/edit
│  │  │  ├─ attendance/           # meetings list, [meetingId], capture, export
│  │  │  ├─ users/                # users + approvals
│  │  │  ├─ groups/               # groups + permission matrix
│  │  │  ├─ audit/
│  │  │  └─ settings/
│  │  ├─ api/
│  │  │  ├─ auth/[...all]/route.ts            # Better Auth
│  │  │  ├─ members/[id]/id-card/route.ts     # PNG/PDF download
│  │  │  ├─ members/id-cards/route.ts         # batch PDF
│  │  │  └─ attendance/export/route.ts        # xlsx/csv download
│  │  ├─ icon.png, apple-icon.png             # favicon from logo
│  │  ├─ layout.tsx, globals.css
│  ├─ components/
│  │  ├─ ui/                      # shadcn primitives
│  │  ├─ layout/                  # sidebar, topbar, mobile nav, theme toggle
│  │  └─ shared/                  # data-table, page-header, stat-card, empty-state
│  ├─ features/                   # one folder per module
│  │  ├─ members/   (actions.ts, queries.ts, schema.ts, components/)
│  │  ├─ attendance/
│  │  ├─ id-card/   (render.tsx, layout-config.ts, qr.ts)
│  │  ├─ users/  groups/  audit/  dashboard/
│  ├─ lib/
│  │  ├─ auth.ts, auth-client.ts  # Better Auth server/client
│  │  ├─ db.ts                    # Prisma client singleton (Neon adapter)
│  │  ├─ rbac.ts                  # can(), requirePermission(), rank checks
│  │  ├─ audit.ts                 # writeAudit()
│  │  ├─ safe-action.ts           # next-safe-action client with auth + RBAC middleware
│  │  ├─ r2.ts                    # upload, signed URL, delete
│  │  ├─ card-link.ts             # card QR links (/m/<token>)
│  │  ├─ psgc.ts, phone.ts, dates.ts
│  ├─ generated/prisma/           # Prisma client output (gitignored)
│  └─ env.ts
├─ proxy.ts                       # Next 16 (formerly middleware): redirect signed-out users
└─ CLAUDE.md
```

## 2. Request flow for a mutation

```
Form (RHF + Zod) ──► Server Action (next-safe-action)
                       1. get session (Better Auth)        → 401 if none / not ACTIVE
                       2. requirePermission('member.update') → 403
                       3. Zod parse input
                       4. prisma.$transaction:
                            a. read "before"
                            b. write change
                            c. writeAudit({ action, entity, before, after })
                       5. revalidatePath / revalidateTag
                     ◄── typed result { data | validationErrors | serverError }
```

- `proxy.ts` only does a cheap redirect for signed-out users. **Real authorization happens in every server action, route handler and server component data loader** (`requirePermission`).
- Effective permissions for a user are loaded once per request with React `cache()`.

## 3. Member photos (Cloudflare R2)

1. In the browser, the user picks a file or takes a selfie (react-webcam), then crops it to a square (react-easy-crop). The browser exports the crop at up to 1024px JPEG, about 200–400 KB. This keeps uploads under Vercel's 4.5 MB request body limit.
2. A server action receives it, checks the permission and validates the type and size. `sharp` produces:
   - `members/{memberId}/photo-{hash}.webp` (600×600)
   - `members/{memberId}/thumb-{hash}.webp` (128×128)
   - EXIF is removed (selfies can contain GPS location).
3. The keys are saved on the member. The old objects are deleted once the new upload succeeds.
4. **Display:** the bucket stays private. Server components create presigned GET URLs (15 min) only for users with `member.view`. The content hash in the key lets browsers cache each version safely.
5. R2 bucket CORS: allow `GET` from the app origin (needed when the browser draws the photo into a canvas).

## 4. ID card generation (download only, not stored)

`GET /api/members/[id]/id-card?side=front|back&format=png|jpg|pdf&dpi=200|300|600&download=1`

- Permission `member.generate_id`. The member must be active and have a photo.
- Templates (`src/features/id-card/assets/front-template.png`, `back-template.png`) are **not** in `public/`: the back carries officers' signatures. The source PSD is in `design/id-template/`.
- Positions come from the PSD layers (1561 × 1008 px template space) in `src/features/id-card/layout.ts`. The 5 px transparent margin is trimmed and the artwork is stretched to exact CR80 proportions (≈2% horizontally).
- `render.ts` composes with sharp: photo (3:4, rounded top corners), QR (`qrcode`, level M), and text drawn as vector paths with `opentype.js` using bundled **Arimo Bold** (Arial-metric, Apache-2.0) — no system fonts needed on Vercel. Long names shrink from 36 px to 24 px, then wrap to two lines, then ellipsis.
- Output: PNG keeps transparent rounded corners (soft copy); JPG and PDF are flattened on white (print). 600 DPI = 2025 × 1275 px; PDF pages are 3.375 × 2.125 in.
- `download=1` → attachment, audit `member.id_generate`, and sets `Member.idGeneratedAt`. Previews (`dpi=200`, no download) are not logged.
- Batch printing: `getIdCardBatch` server action lists members for the current filters; the browser fetches each front (600 DPI JPG) and builds one PDF with `pdf-lib` — avoids Vercel's 4.5 MB response limit.
- `outputFileTracingIncludes` ships the assets with the route; paths in `render.ts` are literal so Turbopack traces only those files.

## 5. Card links and scanning

- `Member.cardToken` (22 chars, 128 random bits, unique) → QR text `${APP_URL}/m/${cardToken}` (`src/lib/card-link.ts`). Rotating the token (Reissue card) cancels the old card.
- Capture screen (`/attendance/capture`): `@yudiel/react-qr-scanner`; on browsers without a native BarcodeDetector (iPhone) it decodes with zxing WASM, self-hosted at `/zxing/zxing_reader.wasm` (copied on install). Camera constraints use only "ideal" sizes (the library default requires ≥640 px height and rejects 480p webcams). Live camera needs HTTPS (or localhost).
- `recordAttendanceByCard` parses the token from the link (any host) or a bare token, looks up the member, requires an OPEN meeting and an active member, inserts the attendance row. A unique-constraint violation (`meetingId + memberId`) returns "already checked in" with the original time — safe with several phones scanning at once.
- Manual entry: `searchMembersForCapture` + `recordAttendanceManual`. The screen polls `getCaptureStatus` every 5 s for the live count and recent check-ins.
- Public page `/m/[token]` is outside the authenticated shell, excluded in `proxy.ts`, `robots: noindex`.

## 6. Attendance export

`GET /api/attendance/export?from=2026-10-01&to=2026-10-31&format=xlsx|csv`

- Permission `attendance.export`. The range is limited to 366 days.
- Dates are interpreted in `Asia/Manila`, and meetings are filtered by `meeting.date`.
- `exceljs` streams a workbook with the **Attendance** and **Summary** sheets (see PRD §3.5). Headers are frozen and columns auto-sized.
- Audited as `attendance.export` with the range.

## 7. Audit trail

- `writeAudit()` is called **inside the same transaction** as the change, so a change is never saved without its log.
- Before/after store only the fields that changed. Secrets (password hashes, tokens) are never logged.
- Login events come from Better Auth hooks (`after` sign-in, failed sign-in).
- The table is append-only from the app: no update or delete actions exist.

## 8. Security checklist

- Every action and route checks the session, `status === ACTIVE` and the required permission.
- Rank rules are enforced on the server for group and user management.
- Zod validation on every input; Prisma prevents SQL injection.
- Better Auth rate limiting on sign-in and sign-up.
- Admin password reset: sets a temporary password with Better Auth's password hasher, revokes the user's sessions, sets `mustChangePassword = true` and is audited. `proxy.ts` and the app layout send that user to `/change-password` until the password is changed.
- Security headers in `next.config.ts`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy: camera=(self)`.
- Secrets live only in Vercel environment variables, validated by `src/env.ts`.
- The R2 bucket is private, uploaded photos have EXIF removed, and signed URLs are short-lived.

## 9. Responsive layout

- **≥ 1024px:** fixed collapsible sidebar + top bar.
- **768–1023px:** icon-only sidebar rail.
- **< 768px:** top bar plus a **bottom navigation bar** (Dashboard · Members · **Scan** (center button) · Attendance · More). The sidebar opens as a sheet from "More".
- The capture screen uses the full screen on mobile, with the camera on top, the result card below and a Manual tab.
