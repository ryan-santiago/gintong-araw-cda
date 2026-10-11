import "server-only"

import { db } from "@/lib/db"

/**
 * Resolves PSGC codes to names on the server, so the stored address never trusts
 * names sent by the browser, and checks the codes belong together.
 */
export async function resolveAddress(codes: {
  regionCode: string
  provinceCode: string
  cityCode: string
  barangayCode: string
}) {
  if (!codes.regionCode && !codes.cityCode && !codes.barangayCode) {
    return {
      regionCode: null,
      regionName: null,
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      barangayCode: null,
      barangayName: null,
    }
  }

  const [region, city, barangay] = await Promise.all([
    db.psgcRegion.findUnique({ where: { code: codes.regionCode } }),
    db.psgcCity.findUnique({ where: { code: codes.cityCode } }),
    db.psgcBarangay.findUnique({ where: { code: codes.barangayCode } }),
  ])
  if (!region || !city || !barangay) return null
  if (city.regionCode !== region.code || barangay.cityCode !== city.code) return null

  const province = city.provinceCode ? await db.psgcProvince.findUnique({ where: { code: city.provinceCode } }) : null

  return {
    regionCode: region.code,
    regionName: region.name,
    provinceCode: province?.code ?? null,
    provinceName: province?.name ?? null,
    cityCode: city.code,
    cityName: city.name,
    barangayCode: barangay.code,
    barangayName: barangay.name,
  }
}
