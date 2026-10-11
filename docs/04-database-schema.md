# 04 — Database Schema (Prisma + Neon PostgreSQL)

Better Auth's tables (`User`, `Session`, `Account`, `Verification`) are listed here so the whole model is in one place. During setup, generate them with the Better Auth CLI and merge in the extra `User` fields below.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URLs come from prisma.config.ts (DATABASE_URL pooled / DIRECT_URL for migrate)
}

// ─────────────────────────────── Auth (Better Auth) ───────────────────────────────

enum UserStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

model User {
  id            String     @id
  name          String
  email         String     @unique
  emailVerified Boolean    @default(false)
  image         String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // app fields
  status        UserStatus @default(PENDING)
  approvedAt    DateTime?
  approvedById  String?
  lastLoginAt   DateTime?
  mustChangePassword Boolean @default(false)  // set when an admin resets the password

  membersCreated Member[]            @relation("MemberCreatedBy")
  membersUpdated Member[]            @relation("MemberUpdatedBy")

  sessions      Session[]
  accounts      Account[]
  groups        UserGroupMember[]
  auditLogs     AuditLog[]           @relation("AuditActor")
  attendances   Attendance[]         @relation("RecordedBy")

  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}

// ─────────────────────────────── RBAC ───────────────────────────────

model Permission {
  id          String            @id @default(cuid())
  key         String            @unique          // e.g. "member.create"
  module      String                             // e.g. "members" (for grouping in the UI)
  description String
  groups      GroupPermission[]

  @@map("permission")
}

model UserGroup {
  id          String            @id @default(cuid())
  name        String            @unique
  description String?
  rank        Int                                // lower = higher authority; Super Admin = 0
  isSystem    Boolean           @default(false)  // system groups cannot be deleted/renamed
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  permissions GroupPermission[]
  members     UserGroupMember[]

  @@index([rank])
  @@map("user_group")
}

model GroupPermission {
  groupId      String
  permissionId String
  group        UserGroup  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([groupId, permissionId])
  @@map("group_permission")
}

model UserGroupMember {
  userId     String
  groupId    String
  assignedAt DateTime  @default(now())
  assignedBy String?
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  group      UserGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([userId, groupId])
  @@map("user_group_member")
}

// ─────────────────────────────── Members ───────────────────────────────

enum MemberPosition {
  PRESIDENT
  VICE_PRESIDENT
  SECRETARY
  BOARD_MEMBER
  LEGAL_ATTORNEY
  LEGAL_SECRETARY
  MEMBER
}

model Member {
  id              String    @id @default(cuid())
  trackingNumber  String    @unique
  firstName       String
  middleName      String?
  lastName        String
  suffix          String?
  position        MemberPosition @default(MEMBER)

  birthDate       DateTime? @db.Date
  memberSince     DateTime? @db.Date       // date the household joined the association

  // PH address (all optional; PSGC codes + denormalised names for display/export)
  addressLine     String?                // house/unit no., street, subdivision
  barangayCode    String?
  barangayName    String?
  cityCode        String?
  cityName        String?
  provinceCode    String?                // null for NCR cities
  provinceName    String?
  regionCode      String?
  regionName      String?
  zipCode         String?

  contactNumber   String?                // E.164: +639XXXXXXXXX
  email           String?
  blockNumber     String
  lotNumber       String

  photoKey        String?                // R2 key, 600px webp
  photoThumbKey   String?                // R2 key, 128px webp

  isActive        Boolean   @default(true)
  deletedAt       DateTime?
  deletedById     String?

  createdAt       DateTime  @default(now())
  createdById     String
  createdBy       User      @relation("MemberCreatedBy", fields: [createdById], references: [id])
  updatedAt       DateTime  @updatedAt
  updatedById     String?
  updatedBy       User?     @relation("MemberUpdatedBy", fields: [updatedById], references: [id])

  attendances     Attendance[]

  @@index([isActive, lastName, firstName])
  @@index([blockNumber, lotNumber])
  @@map("member")
}

// ─────────────────────────────── Meetings & Attendance ───────────────────────────────

enum MeetingStatus {
  SCHEDULED
  OPEN
  CLOSED
}

model Meeting {
  id          String        @id @default(cuid())
  title       String        @default("General Assembly")
  date        DateTime      @db.Date                 // calendar date in Asia/Manila
  startTime   DateTime?                              // full timestamp (UTC)
  location    String?
  notes       String?
  status      MeetingStatus @default(SCHEDULED)
  openedAt    DateTime?
  closedAt    DateTime?
  createdAt   DateTime      @default(now())
  createdById String?
  updatedAt   DateTime      @updatedAt

  attendances Attendance[]

  @@index([date])
  @@map("meeting")
}

enum AttendanceMethod {
  QR
  MANUAL
}

model Attendance {
  id            String           @id @default(cuid())
  meetingId     String
  memberId      String
  checkedInAt   DateTime         @default(now())
  method        AttendanceMethod
  recordedById  String
  meeting       Meeting          @relation(fields: [meetingId], references: [id], onDelete: Restrict)
  member        Member           @relation(fields: [memberId], references: [id], onDelete: Restrict)
  recordedBy    User             @relation("RecordedBy", fields: [recordedById], references: [id])

  @@unique([meetingId, memberId])     // one check-in per member per meeting; protects concurrent scanners
  @@index([memberId, checkedInAt])
  @@map("attendance")
}

// ─────────────────────────────── Audit & Settings ───────────────────────────────

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?                      // null for system / failed anonymous login
  actor      User?    @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)
  action     String                       // e.g. "member.update"
  entityType String?                      // e.g. "Member"
  entityId   String?
  before     Json?
  after      Json?
  metadata   Json?                        // e.g. export range, failed-login email
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])
  @@map("audit_log")
}

model Setting {
  key       String   @id                 // "org.name", "meeting.defaultDay", "attendance.atRiskThreshold"
  value     Json
  updatedAt DateTime @updatedAt
  updatedBy String?

  @@map("setting")
}

// ─────────────────────────────── PSGC reference data ───────────────────────────────

model PsgcRegion {
  code String @id
  name String
  @@map("psgc_region")
}

model PsgcProvince {
  code       String @id
  name       String
  regionCode String
  @@index([regionCode])
  @@map("psgc_province")
}

model PsgcCity {
  code         String  @id
  name         String
  regionCode   String
  provinceCode String?
  @@index([regionCode])
  @@index([provinceCode])
  @@map("psgc_city")
}

model PsgcBarangay {
  code     String @id
  name     String
  cityCode String
  @@index([cityCode])
  @@map("psgc_barangay")
}
```

## Notes

- **Position** labels and order live in `src/features/members/positions.ts`. Adding a position needs an enum value + migration.

- **RateLimit** (`rate_limit`) is Better Auth's rate-limit store (`key`, `count`, `lastRequest BigInt`). Stored in the database so limits hold across Vercel instances.
- **User.mustChangePassword** is set by an admin password reset and cleared when the user picks a new password.

- **Full name** is computed: `First M. Last Suffix` for display, and uppercase on ID cards and in QR codes. It is not stored.
- **Tracking number:** validated with `^\d{4}-\d{4}$` (e.g. `2026-0001`) in Zod and protected by the unique index. The "suggest next" helper finds the highest `YYYY-____` for the current year and adds 1.
- **Required member fields:** `firstName`, `lastName`, `trackingNumber`, `blockNumber` and `lotNumber`. Everything else is optional.
- **created/updated by:** `createdById`/`updatedById` are set in the server action from the session, never from form input. `createdAt`/`updatedAt` are set by Prisma.
- **Soft delete:** queries go through a `members.active()` helper (or a Prisma client extension) that adds `isActive: true` unless told otherwise.
- **At-risk calculation:** for each active member, take the last _N_ `CLOSED` meetings held on or after the member's `createdAt`. The member is at risk if none of those meetings have an attendance row for them. One SQL query covers 500 members easily.
- **Attendance rate:** attended ÷ closed meetings since the member joined.
- **Timezone:** `Meeting.date` is a plain date in Manila time. `checkedInAt` is UTC and converted for display.
- Seed scripts: permissions (code is the source of truth, synced on every deploy), default groups, the first Super Admin from env vars, and PSGC data.
