# 01 — Product Requirements

## 1. Background

Gintong Araw CDA is preparing for a land award. Before that happens, the association needs a central record of its member households so it can:

- know exactly who the members are (one primary contact per household, ~500 now),
- see who fulfils their obligations, starting with **meeting attendance**,
- identify members who are not active,
- issue each member an ID card with a QR code used for check-in.

## 2. Users

| User                    | Description                                              | Typical device  |
| ----------------------- | -------------------------------------------------------- | --------------- |
| **Super Admin**         | Sets up the system, manages groups and permissions       | Laptop          |
| **Officer / Secretary** | Maintains member records, generates IDs, exports reports | Laptop / tablet |
| **Attendance Staff**    | Scans IDs at meetings                                    | Phone           |
| **Viewer**              | Read-only access (e.g. board members)                    | Any             |

Members themselves **do not log in** in v1. A _User_ (system account) and a _Member_ (household record) are separate things.

## 3. Modules

### 3.1 Authentication

- Email + password login.
- **Registration** creates an account in `PENDING` status. An admin approves it and assigns a group. Pending/suspended users cannot sign in.
- **No email is sent by the app.** A forgotten password is reset by an admin (`user.manage`), who sets a temporary password. The user must change it at the next sign-in.
- Signed-in users can change their own password from their profile.
- Login rate limiting and lockout on repeated failures.
- Session expiry after inactivity (default 7 days, sliding).

### 3.2 Users, Groups & Permissions (RBAC with rank)

- Admin creates **User Groups**, gives each a **rank** (lower number = higher authority) and ticks the **permissions** it has.
- Admin assigns users to one or more groups. Effective permissions = union of the user's groups. Effective rank = the best (lowest) rank among them.
- Hierarchy rules — see [05-roles-permissions.md](05-roles-permissions.md).

### 3.3 Members

Fields:

| Field           | Required                     | Notes                                                                                                                                                                                      |
| --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Photo           | No                           | Upload a file **or** take a selfie with the device camera; cropped square. Needed before an ID card can be generated                                                                       |
| First name      | **Yes**                      |                                                                                                                                                                                            |
| Middle name     | No                           |                                                                                                                                                                                            |
| Last name       | **Yes**                      |                                                                                                                                                                                            |
| Suffix          | No                           | Jr., Sr., III — common in PH names                                                                                                                                                         |
| Position        | **Yes** (defaults to Member) | President, Vice-President, Secretary, Board Member, Legal – Attorney, Legal – Secretary, Member. List can be filtered by position or "Officers only"                                       |
| Date of birth   | No                           | Date picker; age shown on the detail page                                                                                                                                                  |
| Member since    | No                           | Date the household joined the association (not the date the record was created)                                                                                                            |
| Address         | No                           | PH format: house/unit + street, Barangay, City/Municipality, Province, Region, ZIP. Cascading dropdowns from PSGC data. If any part is filled in, Region → City → Barangay become required |
| Contact number  | No                           | PH mobile, stored as `+639XXXXXXXXX`                                                                                                                                                       |
| Email           | No                           | Stored for reference only; the app sends no email                                                                                                                                          |
| Tracking number | **Yes**                      | Format `YYYY-NNNN` (e.g. `2026-0001`), typed in by the user, unique                                                                                                                        |
| Block number    | **Yes**                      |                                                                                                                                                                                            |
| Lot number      | **Yes**                      |                                                                                                                                                                                            |

Record fields (set automatically and shown on the detail page): **Created by**, **Created at**, **Updated by**, **Updated at**.

Tracking number rules: must match `^\d{4}-\d{4}$`. The form suggests the next free number for the current year (e.g. `2026-0124`), but the user can change it. Duplicates are rejected.

Behaviour:

- Create, view, edit, **deactivate** (soft delete: `isActive = false`, `deletedAt`, `deletedBy`) and **restore**.
- The list hides inactive members by default, with a filter to show them.
- Search by name, tracking number, block/lot. Filter by status, block, attendance risk.
- Member detail page shows profile, ID card actions, attendance history and attendance rate.

### 3.4 ID Card Generation

- Uses the association's template image(s) stored in `public/id-template/` (front, optional back).
- Places: **photo, full name, tracking number, Block/Lot, QR code**.
- The generated card is **downloaded directly** by the person generating it and is **not stored** anywhere.
- Formats: PNG (single card) and PDF (print-ready; single card or a batch sheet of selected members).
- Every generation is written to the audit trail.

QR content: a link to the member's public page, e.g. `https://gintongaraw.coderyan.dev/m/Xk3p9Qz2LmN8vR4tY6wB1c`.

- The last part is a random 22-character code (not the tracking number), so links can't be guessed.
- The attendance scanner reads the same link; any phone camera opens the member's public page.
- **Reissue card** (lost/stolen) creates a new code; the old card's QR stops working immediately.
- The address comes from `APP_URL` — it must be final before cards are printed.

**Public member page** (`/m/<code>`, no login, hidden from search engines): photo, name, position, tracking number, Block/Lot, active status and the dates the member was present. Never shows contact number, email, address or date of birth. Inactive members' links show "This card is no longer active".

### 3.5 Meetings & Attendance

- A **Meeting** has a date (defaults to the next Sunday but can be any day), an optional start time, a title, a location and a status: `SCHEDULED → OPEN → CLOSED`.
- **Capture Attendance** button opens the capture screen for an open meeting (or offers to create and open today's meeting).
- Two capture modes on the same screen:
  1. **Scan QR** — continuous camera scanning. On success it shows the member's photo and name with a green confirmation and a sound. An unknown or invalid code shows red; a duplicate shows amber with the original check-in time.
  2. **Manual** — type a tracking number or a name and pick from live search results. Confirm the photo and name, then record.
- Each record stores meeting, member, **date and time** of check-in, method (`QR` / `MANUAL`) and who recorded it.
- One record per member per meeting. Several phones can scan at the same time without creating duplicates.
- Mistakes can be removed by a user with `attendance.delete`, and the removal is audited.
- **Export** by date range to `.xlsx` or `.csv`:
  - Sheet 1 "Attendance": Meeting date, Meeting title, Tracking no., Full name, Block, Lot, Time in, Method, Recorded by.
  - Sheet 2 "Summary": one row per active member with meetings held in the range, attended, absent, and attendance rate %.

### 3.6 Audit Trail

- Every create, update, delete, approve, login, export and ID generation is logged with: who, action, entity, before/after values, IP address, user agent and time.
- Read-only screen with filters (user, action, entity, date range) and a diff view.
- Audit logs cannot be edited or deleted from the app.

### 3.7 Dashboard

- Active members count; new members this month.
- Attendance rate for the last meeting and the month to date.
- Attendance trend chart for the last 8 meetings.
- Next meeting card with a **Capture Attendance** button.
- **Members at risk**: missed 3 or more consecutive meetings (threshold configurable).
- Recent activity (latest audit entries the user may see).
- Quick actions: Add member, Scan, Generate ID, Export.

### 3.8 Settings

- Organization name and default meeting day.
- At-risk threshold (consecutive absences).
- ID card layout config (positions/fonts; see architecture doc).

## 4. Non-functional requirements

| Area          | Requirement                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Responsive    | Works from 360px phones to desktop. The scanner screen is built mobile-first                      |
| Theme         | Light and dark mode; follows the system setting by default with a manual toggle                   |
| Performance   | Member list under 1s on 4G; photos lazy-loaded thumbnails                                         |
| Security      | Every server action checks permissions on the server; never rely on hidden buttons alone          |
| Privacy       | Private photo bucket with signed URLs; least-privilege groups; personal data handled per RA 10173 |
| Accessibility | WCAG 2.2 AA contrast, keyboard navigable, visible focus rings                                     |
| Language      | English UI; Filipino names and addresses (ñ, accents) handled correctly                           |
| Backups       | Neon point-in-time restore; monthly manual export kept by an officer                              |

## 5. Out of scope for v1 (possible later)

- Sending email (password reset links, notifications)
- Member self-service login / portal
- Dues and payments tracking ("obligations" beyond attendance)
- SMS notifications for meetings
- Offline scanning with sync (the PWA queue is designed for, not built)
- Land award / lot assignment workflow

## 6. Decisions

| #   | Question                               | Decision / assumption                                                                           |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| D1  | Who can register?                      | Anyone can register; an admin must approve and assign a group                                   |
| D2  | "Contract Number"                      | **Contact number** (phone), optional                                                            |
| D3  | Tracking number                        | ✅ Format `YYYY-NNNN` (e.g. `2026-0001`), entered manually by the creator, unique               |
| D4  | Must Block + Lot be unique per member? | Not enforced (land not yet awarded); duplicates show a warning                                  |
| D5  | ID card back side?                     | Optional second template; template supplied later, before Phase 3                               |
| D6  | Higher-resolution logo                 | `logo.png` is 108×100 px. A 512px+ PNG or a true SVG is needed for a sharp favicon and app icon |
| D7  | Data privacy consent                   | ✅ Removed; no consent field on members                                                         |
| D8  | Email                                  | ✅ No email sending; admins reset passwords                                                     |
