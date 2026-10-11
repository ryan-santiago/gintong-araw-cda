import type { NextRequest } from "next/server"

import { apiViewer } from "@/lib/api"
import { db } from "@/lib/db"

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })
const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name)

/**
 * Address lookups for the cascading selects.
 *   ?level=regions
 *   ?level=provinces&region=CODE   → provinces, plus `independentCities` when the region has cities with no province
 *   ?level=cities&region=CODE&province=CODE|none
 *   ?level=barangays&city=CODE
 */
export async function GET(request: NextRequest) {
  const { error } = await apiViewer()
  if (error) return error

  const sp = request.nextUrl.searchParams
  const level = sp.get("level")
  const cache = { headers: { "Cache-Control": "private, max-age=86400" } }

  if (level === "regions") {
    const regions = await db.psgcRegion.findMany({ select: { code: true, name: true } })
    return Response.json(regions.sort(byName), cache)
  }

  if (level === "provinces") {
    const region = sp.get("region") ?? ""
    const [provinces, independent] = await Promise.all([
      db.psgcProvince.findMany({ where: { regionCode: region }, select: { code: true, name: true } }),
      db.psgcCity.count({ where: { regionCode: region, provinceCode: null } }),
    ])
    return Response.json({ provinces: provinces.sort(byName), independentCities: independent > 0 }, cache)
  }

  if (level === "cities") {
    const region = sp.get("region") ?? ""
    const province = sp.get("province") ?? ""
    const cities = await db.psgcCity.findMany({
      where: province && province !== "none" ? { provinceCode: province } : { regionCode: region, provinceCode: null },
      select: { code: true, name: true },
    })
    return Response.json(cities.sort(byName), cache)
  }

  if (level === "barangays") {
    const barangays = await db.psgcBarangay.findMany({
      where: { cityCode: sp.get("city") ?? "" },
      select: { code: true, name: true },
    })
    return Response.json(barangays.sort(byName), cache)
  }

  return Response.json({ error: "Unknown level" }, { status: 400 })
}
