# 05 — Roles & Permissions

## 1. Model

- **Permission:** a fixed key defined in code (`src/lib/permissions.ts`) and synced into the DB by the seed. Admins cannot invent new permissions; they only assign them.
- **User Group:** a name, a **rank** and a set of permissions. Created by admins.
- **User:** belongs to one or more groups.
  - Effective permissions = **union** of the user's groups.
  - Effective rank = **lowest** rank number among the user's groups (lower = more authority).
  - A user with no group can sign in but sees only an "awaiting access" screen.

## 2. Hierarchy rules (enforced on the server)

Let _R(actor)_ be the actor's effective rank.

1. An actor can create, edit, delete, or assign users to a group only if `group.rank > R(actor)` (strictly lower authority).
2. An actor can only grant a group permissions the actor holds.
3. An actor can approve, suspend, or change the groups of another user only if `R(target) > R(actor)`.
4. Nobody can change their own groups or suspend themselves.
5. The **Super Admin** group (rank 0, `isSystem`) cannot be deleted, renamed or have permissions removed. It always has every permission. There must always be at least one active Super Admin.
6. New groups created by an actor have a rank greater than `R(actor)`. The rank field's minimum in the UI is `R(actor) + 1`.

## 3. Permission catalog

| Module     | Key                  | Allows                                                                              |
| ---------- | -------------------- | ----------------------------------------------------------------------------------- |
| Dashboard  | `dashboard.view`     | View dashboard widgets                                                              |
| Members    | `member.view`        | List and view members (including photos and contact info)                           |
|            | `member.create`      | Add members                                                                         |
|            | `member.update`      | Edit members, change photo                                                          |
|            | `member.deactivate`  | Soft-delete a member                                                                |
|            | `member.restore`     | Reactivate a member                                                                 |
|            | `member.export`      | Export the member list (xlsx/csv)                                                   |
| ID Cards   | `member.generate_id` | Generate and download ID cards (single and batch)                                   |
| Meetings   | `meeting.view`       | View meetings and their attendance                                                  |
|            | `meeting.manage`     | Create, edit, open and close meetings                                               |
| Attendance | `attendance.capture` | Scan or manually record attendance at an OPEN meeting                               |
|            | `attendance.delete`  | Remove a wrong attendance record                                                    |
|            | `attendance.export`  | Export attendance by date range                                                     |
| Users      | `user.view`          | View users                                                                          |
|            | `user.approve`       | Approve or reject pending registrations                                             |
|            | `user.manage`        | Suspend/reactivate users, assign groups, reset password (sets a temporary password) |
| Groups     | `group.view`         | View groups and their permissions                                                   |
|            | `group.manage`       | Create, edit and delete groups and set their permissions                            |
| Audit      | `audit.view`         | View the audit trail                                                                |
| Settings   | `settings.manage`    | Change organization settings and the ID layout                                      |

## 4. Default groups (seeded; editable except Super Admin)

| Group                | Rank | Permissions                                                                                   |
| -------------------- | ---- | --------------------------------------------------------------------------------------------- |
| **Super Admin**      | 0    | All (system group)                                                                            |
| **Administrator**    | 10   | All except `settings.manage`                                                                  |
| **Officer**          | 20   | `dashboard.view`, `member.*`, `member.generate_id`, `meeting.*`, `attendance.*`, `audit.view` |
| **Attendance Staff** | 30   | `dashboard.view`, `member.view`, `meeting.view`, `attendance.capture`                         |
| **Viewer**           | 40   | `dashboard.view`, `member.view`, `meeting.view`                                               |

## 5. Code usage

```ts
// server: throws a 403 ActionError if missing
await requirePermission('member.update')

// server component / client: hide UI only (never the only check)
const { can } = usePermissions()
{can('member.generate_id') && <GenerateIdButton />}
```

Navigation items declare the permission they need, and the sidebar hides items the user can't use.
