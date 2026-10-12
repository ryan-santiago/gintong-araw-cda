# 07 — Roadmap

Each phase ends with something that can be deployed and tested.

## Phase 0 — Foundation

- [x] `git init`; scaffold Next.js 16.4 + TypeScript + Tailwind v4 + ESLint (pnpm)
- [x] shadcn/ui init (radix-nova); apply the "Araw" tokens from [06-design-system.md](06-design-system.md); Plus Jakarta Sans + Geist Mono
- [x] next-themes with a light/dark/system toggle
- [x] Favicon and apple icon from `logo.png` (`pnpm icons`); logo in `public/brand/`
- [x] App shell: sidebar, top bar, mobile bottom nav, Ctrl/⌘K command palette
- [x] Dashboard with sample data; placeholder pages for every module
- [x] `src/env.ts` env validation; Prisma 7 schema + Neon adapter; client generated
- [x] First migration (`20261011120031_init`) applied to Neon
- [ ] Vercel project + Neon integration; preview deploys on every branch (needs owner's accounts)

## Phase 1 — Auth, RBAC, Audit

- [x] Generate `BETTER_AUTH_SECRET`; add Neon connection strings once provided
- [x] Better Auth: login, register (PENDING), change password, rate limits (no email)
- [x] Admin "reset password" (temporary password + forced change on next login)
- [x] `proxy.ts` redirect for signed-out users; "awaiting approval" screen
- [x] Permission catalog + seed (permissions, default groups, first Super Admin)
- [x] `requirePermission`, `usePermissions`, rank guards, `safe-action` client
- [x] `writeAudit()` + login audit hooks
- [x] Users screen: list, approve/reject, suspend, assign groups
- [x] Groups screen: CRUD, rank, permission matrix (checkbox grid by module)
- [x] Audit Trail screen: filters + before/after diff drawer
- [ ] Vercel deploy with production env vars (owner's account)

## Phase 2 — Members

- [x] PSGC seed + cascading address selects
- [x] Member list: server pagination, search, filters, status badges, thumbnails
- [x] R2 credentials received; private bucket verified (no CORS needed: photos are shown via signed links, ID cards render server-side)
- [x] Create/edit form: Zod schema (required: first/last name, tracking no. `YYYY-NNNN`, block, lot), date of birth, member since, optional PH phone/address
- [x] "Suggest next tracking number" helper; created/updated by + at shown on detail page
- [x] Photo: upload or selfie → crop → sharp → R2; signed URL display
- [x] Deactivate / restore with confirmation; audited
- [x] Member detail: profile, attendance history (empty for now)
- [x] Member export (xlsx/csv)

## Phase 3 — ID Cards

- [x] Template received (PSD + PNGs); placeholder positions read from PSD layers → `src/features/id-card/layout.ts`
- [x] QR content (replaced in Phase 4 by card links — see `src/lib/card-link.ts`)
- [x] Renderer (sharp + opentype.js + qrcode): PNG soft copy, JPG/PDF print at 600 DPI, exact 3.375 × 2.125 in
- [x] Single card: preview dialog, Front PNG, Back PNG, print PDF (front + back); audited, `idGeneratedAt` recorded
- [x] Batch: print PDF for the filtered member list (up to 100, assembled in the browser), skips members without photos
- [x] Photos switched to 3:4 portrait to match the card's photo window
- [ ] Print test on real CR80 card stock; check the QR scans at arm's length (owner)

## Phase 4 — Meetings & Attendance

- [x] Meetings: list, create (default next Sunday), edit, open/close/reopen, delete (only without attendance)
- [x] Card QR switched to a link `<APP_URL>/m/<cardToken>` (random 128-bit code); "Reissue card" cancels a lost card
- [x] Public member page `/m/<token>` (no login, no-index): photo, name, position, tracking no., Block/Lot, status, dates present
- [x] Capture screen: QR scanner (self-hosted zxing WASM), result overlay on the camera, sounds/vibration, same-code cooldown
- [x] Manual check-in: live search by tracking no. or name; shows who is already present
- [x] Duplicate-safe (unique meeting+member), works with several phones at once; live count + recent list (5 s refresh)
- [x] "Start today's meeting" shortcut on the capture screen
- [x] Meeting detail: attendees, rate, remove a check-in (audited), export that day
- [x] Export by date range (xlsx: Attendance + Summary + Meetings; csv: Attendance)
- [x] Member page: attendance stats + history
- [ ] Test QR scanning on real phones over HTTPS (needs the deployed site)

## Phase 5 — Dashboard & Insights

- [x] Dashboard on real data: active members, attendance trend (last 8 meetings, click-through), last-meeting rate + change, month average, new members, photos / ID cards progress
- [x] Meeting card: meeting in progress (with Capture) → next scheduled meeting → "No upcoming meeting"
- [x] Members at risk: consecutive missed **closed** meetings since the member was added (threshold in Settings); dashboard top 5 + Members "At risk" tab with "Missed N" badges
- [x] Recent check-ins across meetings
- [x] Settings page: usual meeting day, default title / start time / location (used by New meeting and Start today's meeting), at-risk threshold; changes audited
- [x] Sample data removed

## Phase 6 — Hardening & Launch

- [x] Vitest unit tests (`pnpm test`): RBAC, card links/QR, redirects, dates, names, phones, member schema
- [ ] Playwright E2E for the main flows (needs a separate Neon test branch)
- [x] Security headers/CSP; permission review of every action
- [x] Data Privacy notice page (informational)
- [x] Member import from Excel/CSV with validation preview
- [ ] Load real member data
- [x] Officer user guide (`09-user-guide.md`) and backup/restore runbook (`10-backup-restore.md`)
- [ ] First restore drill

## Phase 7 — Contributions

See `11-contributions.md`.

- [x] Monthly dues derived from a rate schedule (₱1,000 → ₱1,500 from Nov 2026); payments applied oldest month first
- [x] Collect screen (QR scan or manual), repeat-payment warning, void with reason
- [x] Overview (expected vs collected, balances, payments), Excel/CSV export, dashboard card
- [x] Member page ledger; public card page shows payments + balance
- [x] Past-payment import; rates in Settings
- [ ] Import the real payment history since January 2026
- [ ] Assign contribution permissions to the right groups (Groups & Roles)

## Later

- Offline scanning (PWA + IndexedDB queue + sync)
- Expenses / fund balance; other collection types (special assessments)
- SMS meeting reminders
- Member self-service portal
