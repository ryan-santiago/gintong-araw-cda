// Seeds permissions, default groups and the first Super Admin.
// Safe to re-run: permissions are synced, existing groups and users are left alone
// (except the Super Admin group, which always keeps every permission).
import { PrismaNeon } from "@prisma/adapter-neon"
import { hashPassword } from "better-auth/crypto"
import { config } from "dotenv"

import { PrismaClient } from "../src/generated/prisma/client"
import { DEFAULT_GROUPS, PERMISSION_KEYS, PERMISSIONS, SUPER_ADMIN_GROUP } from "../src/lib/permissions"

config({ path: [".env.local", ".env"], quiet: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is not set")

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: databaseUrl }) })

async function syncPermissions() {
  for (const key of PERMISSION_KEYS) {
    const { module, description } = PERMISSIONS[key]
    await db.permission.upsert({
      where: { key },
      create: { key, module, description },
      update: { module, description },
    })
  }
  const removed = await db.permission.deleteMany({ where: { key: { notIn: PERMISSION_KEYS } } })
  console.log(`✔ ${PERMISSION_KEYS.length} permissions synced${removed.count ? `, ${removed.count} removed` : ""}`)
}

async function seedGroups() {
  const permissions = await db.permission.findMany()
  const idOf = new Map(permissions.map((p) => [p.key, p.id]))

  for (const group of DEFAULT_GROUPS) {
    const existing = await db.userGroup.findUnique({ where: { name: group.name } })
    if (existing && !group.isSystem) continue

    const saved = await db.userGroup.upsert({
      where: { name: group.name },
      create: { name: group.name, rank: group.rank, description: group.description, isSystem: !!group.isSystem },
      update: { rank: group.rank, isSystem: true },
    })
    await db.groupPermission.deleteMany({ where: { groupId: saved.id } })
    await db.groupPermission.createMany({
      data: group.permissions.map((key) => ({ groupId: saved.id, permissionId: idOf.get(key)! })),
    })
    console.log(`✔ group "${group.name}" (rank ${group.rank})`)
  }
}

async function seedSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.log("• SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping Super Admin")
    return
  }

  const group = await db.userGroup.findUniqueOrThrow({ where: { name: SUPER_ADMIN_GROUP } })
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    await db.userGroupMember.upsert({
      where: { userId_groupId: { userId: existing.id, groupId: group.id } },
      create: { userId: existing.id, groupId: group.id },
      update: {},
    })
    console.log(`• Super Admin ${email} already exists`)
    return
  }

  const id = crypto.randomUUID()
  await db.$transaction([
    db.user.create({
      data: {
        id,
        name: "Super Admin",
        email,
        emailVerified: true,
        status: "ACTIVE",
        approvedAt: new Date(),
      },
    }),
    db.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await hashPassword(password),
      },
    }),
    db.userGroupMember.create({ data: { userId: id, groupId: group.id } }),
    db.auditLog.create({
      data: { action: "user.seed_super_admin", entityType: "User", entityId: id, after: { email } },
    }),
  ])
  console.log(`✔ Super Admin ${email} created`)
}

async function main() {
  await syncPermissions()
  await seedGroups()
  await seedSuperAdmin()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
