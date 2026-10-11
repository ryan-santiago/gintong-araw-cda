# Backup & Restore

Data lives in two places:

| What                                       | Where                                    | Backed up by                                                               |
| ------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------- |
| Members, users, meetings, attendance, logs | Neon Postgres                            | Neon point-in-time restore (automatic) + monthly `pg_dump` (manual, below) |
| Member photos                              | Cloudflare R2 bucket `gintong-araw`      | Monthly copy (manual, below)                                               |
| ID card templates                          | Git repo (`src/features/id-card/assets`) | The private GitHub repo                                                    |

Generated ID cards are never stored. They can be regenerated at any time.

## 1. Point-in-time restore (Neon, automatic)

Neon keeps a history of every change for your plan's **restore window**. To see it, open the Neon console, select the project, and go to **Settings → Storage / History retention**. On the free plan the window is short (hours, not days), so also keep the monthly dumps below.

To undo a mistake (e.g. a bad import):

1. Neon console → **Branches** → **Restore** (or create a branch _from a point in time_), and choose a time just before the mistake.
2. **Safer option:** restore into a **new branch** first. Point a local `.env.local` `DATABASE_URL` at it, then run `pnpm dev` and check the data.
3. When satisfied, either restore the main branch to that time, or copy only the rows you need.
4. A main-branch restore takes effect immediately. No redeploy is needed because the connection string doesn't change.

## 2. Monthly database dump (manual)

Install PostgreSQL client tools 17+ (for `pg_dump` and `pg_restore`). Then, with the **direct** (non-pooled) Neon connection string:

```bash
pg_dump "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -Fc -f gintong-araw-2026-10.dump
```

Store the file somewhere private, such as an officer's encrypted drive or a private cloud folder. It contains personal data. Keep the last 12 months and delete older dumps.

Also download **Members → Export (Excel)** and **Attendance → Export** each month. These are human-readable copies that officers can open without technical help.

### Restore a dump

Restore into a **new, empty** Neon branch or database, never over production directly:

```bash
pg_restore --no-owner --no-privileges -d "postgresql://USER:PASSWORD@NEW_HOST/neondb?sslmode=require" gintong-araw-2026-10.dump
```

Then point `DATABASE_URL` (Vercel → Settings → Environment Variables) at the restored database and redeploy.

## 3. Photo backup (R2)

Copy the bucket monthly with [rclone](https://rclone.org) (configure an `r2` remote with the R2 access key):

```bash
rclone sync r2:gintong-araw ./backup/photos-2026-10 --progress
```

To restore, run `rclone copy ./backup/photos-2026-10 r2:gintong-araw`. Photo keys are `members/{memberId}/…`, so restored photos match the database by member id.

## 4. Restore drill (twice a year)

1. Create a Neon branch from a point in time 1 hour ago, and restore last month's dump into another new branch.
2. Run the app locally against each (`DATABASE_URL=… pnpm dev`). Sign in, open a few members, and check that counts match the Dashboard.
3. Delete the test branches.
4. Write down the date and result here:

| Date | Who | Result |
| ---- | --- | ------ |
|      |     |        |

## Secrets

Keep a copy of the production environment variables (Vercel → Settings → Environment Variables) in a password manager: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `R2_*`. If `BETTER_AUTH_SECRET` is lost, everyone is signed out but no data is lost. Set a new secret and redeploy.
