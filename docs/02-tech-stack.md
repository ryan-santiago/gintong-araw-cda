# 02 — Tech Stack

Pin exact versions in `package.json` when scaffolding. The versions below are the major lines to target.

## Core

| Concern         | Choice                                                        | Notes                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | **Next.js 16.4** (App Router, Cache Components on)            | Turbopack is the default bundler. Session reads must sit inside `<Suspense>`. `middleware.ts` is now **`proxy.ts`**. Request APIs (`params`, `searchParams`, `cookies()`, `headers()`) are async only. Requires Node.js 20.9+ |
| Language        | **TypeScript** (strict)                                       | `strict: true`, `noUncheckedIndexedAccess: true`                                                                                                                                                                              |
| UI runtime      | **React 19.3**                                                | Ships with Next 16.4                                                                                                                                                                                                          |
| Styling         | **Tailwind CSS v4**                                           | CSS-first config (`@theme` in `globals.css`), no `tailwind.config.js`                                                                                                                                                         |
| Components      | **shadcn/ui**                                                 | Copied into `src/components/ui`; theme tokens in [06-design-system.md](06-design-system.md)                                                                                                                                   |
| Icons           | **lucide-react**                                              |                                                                                                                                                                                                                               |
| Theme switching | **next-themes**                                               | `class` strategy, system default                                                                                                                                                                                              |
| Font            | **Plus Jakarta Sans** + **Geist Mono** via `next/font/google` | Mono for tracking numbers and codes                                                                                                                                                                                           |

## Data

| Concern          | Choice                                             | Notes                                                                                                                             |
| ---------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Database         | **Neon PostgreSQL**                                | Use the **pooled** connection string at runtime and the **direct** one for migrations                                             |
| ORM              | **Prisma 7.10**                                    | `prisma-client` generator with output to `src/generated/prisma`, `prisma.config.ts`, Neon driver adapter (`@prisma/adapter-neon`) |
| Validation       | **Zod 4**                                          | One schema per form, shared by client and server                                                                                  |
| Forms            | **React Hook Form** + `@hookform/resolvers`        | Used through shadcn `Form` components                                                                                             |
| Server mutations | **Server Actions** wrapped by **next-safe-action** | Central place for the auth, permission, Zod and audit pipeline                                                                    |
| Client data      | **TanStack Query**                                 | Only where live client fetching is needed (scanner feed, live search)                                                             |
| Tables           | **TanStack Table**                                 | shadcn Data Table pattern; server-side pagination                                                                                 |
| URL state        | **nuqs**                                           | Filters, search and pagination kept in the URL                                                                                    |

## Auth

| Concern          | Choice                                        | Notes                                                                                                                                                                                          |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication   | **Better Auth** (email + password)            | Prisma adapter and built-in rate limiting. Adds `status` and `mustChangePassword` to the user. **No email provider**: verification and reset emails are turned off, and admins reset passwords |
| Password hashing | Better Auth default (scrypt)                  |                                                                                                                                                                                                |
| Authorization    | **Custom RBAC** (groups + permissions + rank) | See [05-roles-permissions.md](05-roles-permissions.md)                                                                                                                                         |

## Files, images, ID cards

| Concern          | Choice                                 | Notes                                                                                     |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Photo storage    | **Cloudflare R2** (private bucket)     | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`                                    |
| Image processing | **sharp**                              | Resize to 600px and 128px WebP, strip EXIF (removes GPS data from selfies)                |
| Camera / selfie  | **react-webcam**                       | Front/back camera switch                                                                  |
| Cropping         | **react-easy-crop**                    | Square crop before upload                                                                 |
| ID card render   | **`next/og` `ImageResponse`** (Satori) | JSX → PNG with bundled fonts. No native dependencies and no system fonts needed on Vercel |
| ID card PDF      | **pdf-lib**                            | Wraps card PNGs at CR80 size (85.6 × 54 mm), batch A4 sheets                              |
| QR generate      | **qrcode**                             | SVG output embedded into the card                                                         |
| QR scan          | **@yudiel/react-qr-scanner**           | Camera scanning in mobile browsers                                                        |
| Card links       | Node `crypto` random token             | `<APP_URL>/m/<cardToken>`, rotated by "Reissue card"                                      |

## Reporting & utilities

| Concern         | Choice                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Excel export    | **exceljs**                                                                           |
| CSV export      | Hand-written (simple) or `papaparse`                                                  |
| Dates           | **date-fns** + **@date-fns/tz** (`Asia/Manila`)                                       |
| Phone numbers   | **libphonenumber-js**                                                                 |
| PH address      | **PSGC** data (Philippine Statistics Authority) imported into the DB by a seed script |
| Charts          | **shadcn Charts** (Recharts)                                                          |
| Toasts          | **sonner** (shadcn)                                                                   |
| Command palette | shadcn **Command** (cmdk) for `Ctrl/⌘ + K` search                                     |
| Motion          | **motion** (sparingly: scanner feedback, page transitions)                            |

## Quality & tooling

| Concern         | Choice                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Package manager | **pnpm**                                                                                                                 |
| Lint / format   | ESLint 9 (flat config; Next 16 removed `next lint`, so run `eslint` directly) + Prettier + `prettier-plugin-tailwindcss` |
| Unit tests      | **Vitest** + Testing Library                                                                                             |
| E2E tests       | **Playwright** (login, member CRUD, scan flow with a mocked camera)                                                      |
| Git hooks       | lefthook or husky + lint-staged                                                                                          |
| Env validation  | **@t3-oss/env-nextjs** with Zod                                                                                          |

## Hosting

| Service           | Plan           | Notes                                                                                                                       |
| ----------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Vercel**        | Hobby to start | Hobby is for non-commercial use. For an organization, check whether Pro is needed (a nonprofit may qualify for sponsorship) |
| **Neon**          | Free           | 0.5 GB is far more than 500 members and years of attendance need                                                            |
| **Cloudflare R2** | Free tier      | ~35 MB of photos; egress is free                                                                                            |

## Environment variables

Values are kept in `.env.local` (gitignored) for development and in Vercel project settings for deploys. Status is tracked below.

```bash
# Database (Neon)                                   status: pending (owner will provide)
DATABASE_URL=            # pooled connection (-pooler host)
DIRECT_URL=              # direct connection, used for migrations

# Auth                                              status: to generate
BETTER_AUTH_SECRET=      # openssl rand -base64 32
BETTER_AUTH_URL=         # http://localhost:3000 locally; Vercel URL in production

# Cloudflare R2                                     status: pending (owner will provide)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=gintong-araw-photos

# Public address printed in ID card QR links (final before printing cards)
APP_URL=                 # https://gintongaraw.coderyan.dev

# First Super Admin (used once by the seed)
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

`src/env.ts` makes R2 variables optional until Phase 2 so earlier phases can run without them.
