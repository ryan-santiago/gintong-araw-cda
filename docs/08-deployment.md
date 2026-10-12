# 08 — Deployment Guide (Vercel + Hostinger DNS)

Goal: the app runs on Vercel at **https://gintongaraw.coderyan.dev**, using the `coderyan.dev` domain managed at Hostinger.

```
Phone / browser ──► gintongaraw.coderyan.dev ──(CNAME at Hostinger)──► Vercel ──► Neon (database)
                                                                             └──► Cloudflare R2 (photos)
```

Total time: about 30–45 minutes, plus DNS propagation (usually 5–30 minutes, up to a few hours).

---

## Part 1 — Before you start

Have these ready:

- [ ] The code pushed to a **private** GitHub repository (the ID templates contain officers' signatures).
- [ ] A Vercel account — sign up at vercel.com **with your GitHub account** so it can see the repo.
- [ ] Access to Hostinger hPanel for `coderyan.dev`.
- [ ] Your `.env.local` open — you'll copy values from it.

> **Note on the Vercel plan:** the free _Hobby_ plan is meant for personal, non-commercial use. A community association's internal tool is usually fine to start with, but check Vercel's current terms. If needed, the _Pro_ plan can be enabled later without changing anything in the app.

---

## Part 2 — Create the Vercel project

1. Go to **vercel.com → Add New… → Project**.
2. Under **Import Git Repository**, find `gintong-araw-app` and click **Import**.
   - Don't see it? Click **Adjust GitHub App Permissions** and allow Vercel to access the repository.
3. On the **Configure Project** screen:
   - **Framework Preset:** Next.js (detected automatically)
   - **Root Directory:** `./`
   - **Build / Output / Install commands:** leave the defaults (Vercel detects pnpm from `pnpm-lock.yaml`).
4. Open **Environment Variables** on the same screen and add everything in Part 3 **before** clicking Deploy. (If you deploy first, the build fails because required settings are missing — that's expected; add them and redeploy.)

---

## Part 3 — Environment variables

Add each one for **Production** and **Preview** (tick both). Mark secrets as **Sensitive**.

| Name                           | Value                                                       | Notes                                                                           |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Neon **pooled** connection string (host contains `-pooler`) | Copy from `.env.local`                                                          |
| `DIRECT_URL`                   | Neon **direct** connection string                           | Copy from `.env.local`                                                          |
| `BETTER_AUTH_SECRET`           | Same as `.env.local`                                        | Keep it identical, or everyone is signed out                                    |
| `BETTER_AUTH_URL`              | `https://gintongaraw.coderyan.dev`                          | No trailing slash                                                               |
| `APP_URL`                      | `https://gintongaraw.coderyan.dev`                          | Printed in every ID card QR — must be final before printing cards               |
| `R2_ACCOUNT_ID`                | Same as `.env.local`                                        |                                                                                 |
| `R2_ACCESS_KEY_ID`             | Same as `.env.local`                                        |                                                                                 |
| `R2_SECRET_ACCESS_KEY`         | Same as `.env.local`                                        |                                                                                 |
| `R2_BUCKET`                    | `gintong-araw`                                              |                                                                                 |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`                                                         | Makes Vercel use pnpm 11 (from `package.json`) so install scripts run correctly |

Do **not** add `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the database is already seeded.

> **Tip — faster pages:** your Neon database is in Singapore (`ap-southeast-1`). In **Project → Settings → Functions → Function Region**, choose **Singapore (sin1)** so the app runs next to the database.

---

## Part 4 — First deploy

1. Click **Deploy**.
2. Watch the build log. You should see these lines (they run during the build step) — they confirm the generated files were created:
   ```
   ✔ Generated Prisma Client (7.10.0) …
   ✔ MediaPipe wasm → public/mediapipe/wasm
   ✔ zxing-wasm@… reader → public/zxing/zxing_reader.wasm
   ```
3. When it finishes, Vercel shows a URL like `gintong-araw-app.vercel.app`. **Signing in there will fail with "Invalid origin"** — that's expected, because `BETTER_AUTH_URL` points to the custom domain. Continue to Part 5.

---

## Part 5 — Add the domain in Vercel

1. In the project: **Settings → Domains → Add Domain**.
2. Type `gintongaraw.coderyan.dev` → **Add**.
   - If Vercel asks whether to redirect, choose to add it as the main domain (no redirect).
3. Vercel shows **Invalid Configuration** with the DNS record you need, for example:

   | Type  | Name          | Value                                                                                     |
   | ----- | ------------- | ----------------------------------------------------------------------------------------- |
   | CNAME | `gintongaraw` | `cname.vercel-dns.com` _(or a project-specific value like `xxxxxxxx.vercel-dns-017.com`)_ |

   **Copy the exact value Vercel shows** — newer projects get a project-specific CNAME target. Keep this tab open.

4. If Vercel also shows a **TXT** record named `_vercel` (this happens when `coderyan.dev` is already used in another Vercel account), you'll add that too in Part 6.

---

## Part 6 — Create the subdomain record in Hostinger

### 6.1 Check where `coderyan.dev`'s DNS is managed

1. Log in to **hPanel → Domains** → click **coderyan.dev**.
2. Open **DNS / Nameservers**.
   - If the nameservers are Hostinger's (e.g. `ns1.dns-parking.com`, `ns2.dns-parking.com`), continue below.
   - If they point somewhere else (e.g. Cloudflare), **add the record at that provider instead** — Hostinger's DNS editor won't be used. The record itself is the same.

### 6.2 Remove anything that conflicts

In the **DNS records** list, look for existing records with the name **`gintongaraw`** (A, AAAA or CNAME). Delete them — a name can only have one CNAME and nothing else alongside it. A wildcard `*` record is fine; the specific record you add takes priority.

### 6.3 Add the CNAME record

Under **Manage DNS records → Add record**:

| Field                  | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Type**               | `CNAME`                                                                                  |
| **Name**               | `gintongaraw` _(only the subdomain part — Hostinger adds `.coderyan.dev` automatically)_ |
| **Points to / Target** | the value Vercel showed, e.g. `cname.vercel-dns.com`                                     |
| **TTL**                | `3600` (default is fine; `300` makes later changes apply faster)                         |

Click **Add Record**.

Common mistakes:

- Name `gintongaraw.coderyan.dev` → Hostinger turns it into `gintongaraw.coderyan.dev.coderyan.dev`. Use just **`gintongaraw`**.
- Using type **A** with an IP — use **CNAME** as Vercel instructs.

### 6.4 Only if Vercel asked for a TXT record

| Field     | Value                                       |
| --------- | ------------------------------------------- |
| **Type**  | `TXT`                                       |
| **Name**  | `_vercel`                                   |
| **Value** | the `vc-domain-verify=…` text Vercel showed |

### 6.5 Only if `coderyan.dev` has CAA records

If the DNS list contains **CAA** records for `coderyan.dev` (or `@`), add one so Vercel can issue the HTTPS certificate:

| Type | Name | Flag | Tag     | Value             |
| ---- | ---- | ---- | ------- | ----------------- |
| CAA  | `@`  | `0`  | `issue` | `letsencrypt.org` |

No CAA records at all? Skip this — certificates work by default.

---

## Part 7 — Verify

1. Back in **Vercel → Settings → Domains**, wait until `gintongaraw.coderyan.dev` shows **Valid Configuration** (refresh after a few minutes). Vercel then issues the HTTPS certificate automatically.
2. Optional check from your PC (PowerShell):
   ```powershell
   Resolve-DnsName gintongaraw.coderyan.dev -Type CNAME
   ```
   It should show the Vercel target. Online alternative: dnschecker.org → `gintongaraw.coderyan.dev`, type CNAME.
3. Open **https://gintongaraw.coderyan.dev**.
   - `.dev` domains only work over **https://** (browsers enforce it). That's what we want — it's also what makes the phone camera work.
4. If you changed any environment variable after the first deploy: **Deployments → … on the latest → Redeploy**.

---

## Part 8 — Smoke test after going live

- [ ] Sign in as the Super Admin.
- [ ] **Change the Super Admin password** (user menu → Change password) — the old one was shared in chat.
- [ ] Members: open a member, upload a photo, try **Remove background**.
- [ ] ID card: preview, download the PNG, scan its QR with your iPhone camera → it should open `https://gintongaraw.coderyan.dev/m/…`.
- [ ] Meetings → New meeting → Open → **Capture attendance** on your iPhone → scan the card (live camera now works over HTTPS).
- [ ] Attendance → Export (Excel).
- [ ] iPhone Safari → Share → **Add to Home Screen** → open it from the home screen.
- [ ] Regenerate any ID cards made during local testing — their QR points to `localhost`.

---

## Part 9 — Everyday operations

| Task                            | How                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ship an update**              | Push to `main` → Vercel builds and deploys automatically. Other branches get Preview deployments (sign-in works only on the main domain).                                |
| **Database change (migration)** | Before pushing the code, run once from your PC: `pnpm exec prisma migrate deploy` (uses `DIRECT_URL` from `.env.local`). Migrations are not run during the Vercel build. |
| **Roll back a bad deploy**      | Vercel → Deployments → pick the previous good one → **Promote to Production**.                                                                                           |
| **Change a secret**             | Update it in Vercel → Settings → Environment Variables → **Redeploy**. Also update `.env.local`.                                                                         |
| **Logs / errors**               | Vercel → Project → **Logs** (filter by status 500).                                                                                                                      |

---

## Part 10 — Troubleshooting

| Symptom                                                        | Cause → fix                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails at **install** or **prisma generate**              | `ENABLE_EXPERIMENTAL_COREPACK=1` missing → add it and redeploy.                                                                                                                                                                                                                                                                                           |
| Build fails with **Can't resolve '@/generated/prisma/client'** | Vercel reused cached `node_modules` and skipped install scripts. Fixed: `pnpm build` now runs `prisma generate` and the WASM copy itself. If it ever recurs: Deployments → Redeploy → untick **Use existing Build Cache**.                                                                                                                                |
| Build fails with **Invalid environment variables**             | A required variable is missing or empty → compare with Part 3.                                                                                                                                                                                                                                                                                            |
| Sign-in shows **Invalid origin**                               | You're on the `.vercel.app` or a preview URL, or `BETTER_AUTH_URL` doesn't exactly match `https://gintongaraw.coderyan.dev`.                                                                                                                                                                                                                              |
| Domain stuck on **Invalid Configuration**                      | Record name typed as the full domain; a conflicting A/CNAME for `gintongaraw` still exists; DNS is managed somewhere other than Hostinger (6.1); or propagation is still running — wait up to a few hours.                                                                                                                                                |
| **Certificate** error / "not secure"                           | Usually resolves within minutes of the domain becoming valid. If you have CAA records, see 6.5.                                                                                                                                                                                                                                                           |
| Member photos don't load / upload fails                        | Check the four `R2_*` variables.                                                                                                                                                                                                                                                                                                                          |
| Camera doesn't open on phones                                  | Make sure you're on `https://gintongaraw.coderyan.dev` (not http, not an IP address), and allow camera access when Safari asks.                                                                                                                                                                                                                           |
| QR on a card opens `localhost`                                 | The card was generated before `APP_URL` was set — regenerate it on the live site.                                                                                                                                                                                                                                                                         |
| App is **slow** (each page or scan takes ~1 s or more)         | Server functions running far from the database. Neon is in Singapore, so `vercel.json` pins functions to **sin1**. Check: response header `x-vercel-id` should look like `sin1::sin1::…`, not `sin1::iad1::…`. Also Settings → Functions → Function Region. The first request after ~5 idle minutes is also slower while the free Neon database wakes up. |
