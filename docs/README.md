# Gintong Araw CDA — Member Management System

Responsive web app for the **Gintong Araw Community Development Association, Inc.** to keep one central record of member households (~500), issue member ID cards with QR codes, and track meeting attendance so the association can see who is active.

## Documents

| #   | Document                                           | What it covers                                                                  |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| 01  | [Product Requirements](01-product-requirements.md) | Goals, users, modules, functional rules, open decisions                         |
| 02  | [Tech Stack](02-tech-stack.md)                     | Frameworks, libraries, services, and why each was chosen                        |
| 03  | [Architecture](03-architecture.md)                 | Folder structure, request flow, security, photos, ID cards, QR, export          |
| 04  | [Database Schema](04-database-schema.md)           | Prisma schema for Neon PostgreSQL                                               |
| 05  | [Roles & Permissions](05-roles-permissions.md)     | Permission catalog, rank hierarchy rules, default groups                        |
| 06  | [Design System](06-design-system.md)               | Color palette, typography, layout, components, dark mode                        |
| 07  | [Roadmap](07-roadmap.md)                           | Build phases and acceptance checklist                                           |
| 08  | [Deployment](08-deployment.md)                     | Vercel setup, environment variables, Hostinger DNS for gintongaraw.coderyan.dev |
| 09  | [Officer user guide](09-user-guide.md)             | Day-to-day use: members, import, ID cards, meetings, attendance                 |
| 10  | [Backup & restore](10-backup-restore.md)           | Neon point-in-time restore, monthly dumps, R2 photo copy, drills                |

## At a glance

- **Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Prisma · Neon PostgreSQL · Better Auth · Cloudflare R2 · Vercel
- **Modules:** Auth · Users & Groups (RBAC with rank) · Members · ID Card Generation · Meetings & Attendance · Audit Trail · Dashboard
- **Timezone:** all times displayed in `Asia/Manila`, stored in UTC
- **Privacy:** member data is personal information under the Data Privacy Act of 2012 (RA 10173)
