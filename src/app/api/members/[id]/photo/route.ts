import { createHash } from "node:crypto"

import sharp from "sharp"

import { apiViewer } from "@/lib/api"
import { writeAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { deleteObjects, putObject } from "@/lib/r2"

const MAX_BYTES = 4 * 1024 * 1024 // Vercel caps request bodies at 4.5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]

/** Upload (or replace) a member photo. Body: multipart form with a `file` field (already cropped to 3:4 portrait). */
export async function POST(request: Request, ctx: RouteContext<"/api/members/[id]/photo">) {
  const { viewer, error } = await apiViewer("member.update")
  if (error) return error
  const { id } = await ctx.params

  const member = await db.member.findUnique({ where: { id }, select: { photoKey: true, photoThumbKey: true } })
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ error: "No photo was sent." }, { status: 400 })
  if (!ACCEPTED.includes(file.type)) return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 })
  if (file.size > MAX_BYTES) return Response.json({ error: "The photo is too large (max 4 MB)." }, { status: 413 })

  let photo: Buffer
  let thumb: Buffer
  try {
    // .rotate() applies EXIF orientation; output has no metadata (removes GPS data from phone photos).
    const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate()
    // Portrait 3:4 to match the ID card photo window; the square thumbnail keeps the top (face).
    photo = await source.clone().resize(600, 800, { fit: "cover" }).webp({ quality: 85 }).toBuffer()
    thumb = await source.clone().resize(128, 128, { fit: "cover", position: "top" }).webp({ quality: 78 }).toBuffer()
  } catch {
    return Response.json({ error: "That file couldn't be read as an image." }, { status: 422 })
  }

  const hash = createHash("sha256").update(photo).digest("hex").slice(0, 12)
  const photoKey = `members/${id}/photo-${hash}.webp`
  const photoThumbKey = `members/${id}/thumb-${hash}.webp`
  await Promise.all([putObject(photoKey, photo, "image/webp"), putObject(photoThumbKey, thumb, "image/webp")])

  await db.$transaction(async (tx) => {
    await tx.member.update({ where: { id }, data: { photoKey, photoThumbKey, updatedById: viewer.id } })
    await writeAudit(tx, {
      actorId: viewer.id,
      action: member.photoKey ? "member.photo_update" : "member.photo_add",
      entityType: "Member",
      entityId: id,
      metadata: { bytes: photo.length },
    })
  })

  // Old versions are no longer referenced.
  if (member.photoKey !== photoKey) {
    await deleteObjects([member.photoKey, member.photoThumbKey]).catch((e) => console.error("R2 cleanup failed", e))
  }
  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/members/[id]/photo">) {
  const { viewer, error } = await apiViewer("member.update")
  if (error) return error
  const { id } = await ctx.params

  const member = await db.member.findUnique({ where: { id }, select: { photoKey: true, photoThumbKey: true } })
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 })
  if (!member.photoKey) return Response.json({ ok: true })

  await db.$transaction(async (tx) => {
    await tx.member.update({ where: { id }, data: { photoKey: null, photoThumbKey: null, updatedById: viewer.id } })
    await writeAudit(tx, { actorId: viewer.id, action: "member.photo_remove", entityType: "Member", entityId: id })
  })
  await deleteObjects([member.photoKey, member.photoThumbKey]).catch((e) => console.error("R2 cleanup failed", e))
  return Response.json({ ok: true })
}
