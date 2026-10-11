import type { NextRequest } from "next/server"

import { cardFileName, loadCardData } from "@/features/id-card/data"
import { cardPdf, renderBack, renderFront, type ImageFormat } from "@/features/id-card/render"
import { apiViewer } from "@/lib/api"
import { writeAudit } from "@/lib/audit"
import { db } from "@/lib/db"

const DPIS = [200, 300, 600]

/**
 * GET /api/members/[id]/id-card
 *   ?side=front|back      (default front)
 *   &format=png|jpg|pdf   (default png; pdf = print file with front + back pages)
 *   &dpi=200|300|600      (default 600 = print quality; 200 for on-screen previews)
 *   &download=1           (attachment + audit; previews are not logged)
 *   &batch=1              (marks the audit entry as part of a batch print)
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/members/[id]/id-card">) {
  const { viewer, error } = await apiViewer("member.generate_id")
  if (error) return error
  const { id } = await ctx.params

  const sp = request.nextUrl.searchParams
  const side = sp.get("side") === "back" ? "back" : "front"
  const format = (["png", "jpg", "pdf"].includes(sp.get("format") ?? "") ? sp.get("format") : "png") as
    ImageFormat | "pdf"
  const dpi = DPIS.includes(Number(sp.get("dpi"))) ? Number(sp.get("dpi")) : 600
  const download = sp.get("download") === "1"

  const loaded = await loadCardData(id)
  if ("error" in loaded) return Response.json({ error: loaded.error }, { status: loaded.status })
  const { member, data } = loaded

  let body: Buffer
  let contentType: string
  let fileName: string
  if (format === "pdf") {
    const [front, back] = await Promise.all([renderFront(data, dpi, "jpg"), renderBack(dpi, "jpg")])
    body = await cardPdf([front], back, `${member.name} — ID card`)
    contentType = "application/pdf"
    fileName = cardFileName(member, "ID-print", "pdf")
  } else {
    body = side === "back" ? await renderBack(dpi, format) : await renderFront(data, dpi, format)
    contentType = format === "png" ? "image/png" : "image/jpeg"
    fileName = cardFileName(member, `ID-${side}`, format)
  }

  if (download && (format === "pdf" || side === "front")) {
    await db.$transaction(async (tx) => {
      await tx.member.update({ where: { id }, data: { idGeneratedAt: new Date() } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "member.id_generate",
        entityType: "Member",
        entityId: id,
        metadata: { format, dpi, batch: sp.get("batch") === "1", trackingNumber: member.trackingNumber },
      })
    })
  }

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
