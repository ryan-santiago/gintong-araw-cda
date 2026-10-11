import { z } from "zod"

import { POSITION_VALUES } from "@/features/members/positions"
import { normalizePhone } from "@/lib/phone"

export const TRACKING_NUMBER_PATTERN = /^\d{4}-\d{4}$/

const optionalText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters.`)
const DAY = /^\d{4}-\d{2}-\d{2}$/

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())
}

const optionalDay = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || DAY.test(v), `Enter a valid ${label}.`)
    .refine((v) => v === "" || v >= "1900-01-01", `Enter a valid ${label}.`)
    .refine((v) => v === "" || v <= todayIso(), `${label[0]!.toUpperCase()}${label.slice(1)} can't be in the future.`)

export const memberSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter the first name.").max(60),
    middleName: optionalText(60),
    lastName: z.string().trim().min(1, "Enter the last name.").max(60),
    suffix: optionalText(10),
    position: z.enum(POSITION_VALUES, { error: "Choose a position." }),
    birthDate: optionalDay("date of birth"),
    memberSince: optionalDay("member since date"),

    trackingNumber: z.string().trim().regex(TRACKING_NUMBER_PATTERN, "Use the format YYYY-NNNN, e.g. 2026-0001."),
    blockNumber: z.string().trim().min(1, "Enter the block number.").max(10).toUpperCase(),
    lotNumber: z.string().trim().min(1, "Enter the lot number.").max(10).toUpperCase(),

    contactNumber: z
      .string()
      .trim()
      .refine((v) => v === "" || normalizePhone(v) !== null, "Enter a valid PH number, e.g. 0917 123 4567."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address."),

    addressLine: optionalText(160),
    regionCode: z.string().trim(),
    provinceCode: z.string().trim(),
    cityCode: z.string().trim(),
    barangayCode: z.string().trim(),
    zipCode: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}$/.test(v), "ZIP codes have 4 digits."),
  })
  .superRefine((v, ctx) => {
    const anyAddress = v.addressLine || v.regionCode || v.cityCode || v.barangayCode || v.zipCode
    if (!anyAddress) return
    if (!v.regionCode) ctx.addIssue({ code: "custom", path: ["regionCode"], message: "Choose a region." })
    if (!v.cityCode) ctx.addIssue({ code: "custom", path: ["cityCode"], message: "Choose a city or municipality." })
    if (!v.barangayCode) ctx.addIssue({ code: "custom", path: ["barangayCode"], message: "Choose a barangay." })
  })

export type MemberInput = z.infer<typeof memberSchema>

export const emptyMember: MemberInput = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  position: "MEMBER",
  birthDate: "",
  memberSince: "",
  trackingNumber: "",
  blockNumber: "",
  lotNumber: "",
  contactNumber: "",
  email: "",
  addressLine: "",
  regionCode: "",
  provinceCode: "",
  cityCode: "",
  barangayCode: "",
  zipCode: "",
}

export const memberIdSchema = z.object({ id: z.string().min(1) })

export const blockLotSchema = z.object({
  blockNumber: z.string().trim().max(10),
  lotNumber: z.string().trim().max(10),
  excludeId: z.string().optional(),
})
