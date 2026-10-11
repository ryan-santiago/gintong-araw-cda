import { z } from "zod"

export const userIdSchema = z.object({ userId: z.string().min(1) })

export const approveUserSchema = z.object({
  userId: z.string().min(1),
  groupIds: z.array(z.string().min(1)).min(1, "Choose at least one group."),
})

export const setUserGroupsSchema = z.object({
  userId: z.string().min(1),
  groupIds: z.array(z.string().min(1)),
})

export const setUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
})
