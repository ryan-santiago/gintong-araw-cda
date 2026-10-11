// Loads Philippine Standard Geographic Code reference data (regions, provinces,
// cities/municipalities, barangays) into the database. Safe to re-run.
// Source: https://psgc.gitlab.io/api (static JSON mirror of the PSA PSGC publication).
import { PrismaNeon } from "@prisma/adapter-neon"
import { config } from "dotenv"

import { PrismaClient } from "../src/generated/prisma/client"

config({ path: [".env.local", ".env"], quiet: true })

const SOURCE = "https://psgc.gitlab.io/api"
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is not set")
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: databaseUrl }) })

type Code = string | false
type Region = { code: string; name: string; regionName: string }
type Province = { code: string; name: string; regionCode: string }
type City = { code: string; name: string; regionCode: string; provinceCode: Code }
type Barangay = { code: string; name: string; cityCode: Code; municipalityCode: Code }

async function get<T>(path: string): Promise<T[]> {
  const res = await fetch(`${SOURCE}/${path}.json`)
  if (!res.ok) throw new Error(`Failed to download ${path}: ${res.status}`)
  return res.json() as Promise<T[]>
}

function regionLabel(r: Region) {
  return r.regionName === r.name ? r.name : `${r.regionName} (${r.name})`
}

async function insertChunks<T>(label: string, rows: T[], insert: (chunk: T[]) => Promise<{ count: number }>) {
  let added = 0
  for (let i = 0; i < rows.length; i += 5000) added += (await insert(rows.slice(i, i + 5000))).count
  console.log(`✔ ${label}: ${rows.length} rows (${added} new)`)
}

async function main() {
  console.log("Downloading PSGC data…")
  const [regions, provinces, cities, barangays] = await Promise.all([
    get<Region>("regions"),
    get<Province>("provinces"),
    get<City>("cities-municipalities"),
    get<Barangay>("barangays"),
  ])

  await insertChunks("regions", regions, (chunk) =>
    db.psgcRegion.createMany({
      data: chunk.map((r) => ({ code: r.code, name: regionLabel(r) })),
      skipDuplicates: true,
    })
  )
  await insertChunks("provinces", provinces, (chunk) =>
    db.psgcProvince.createMany({
      data: chunk.map((p) => ({ code: p.code, name: p.name, regionCode: p.regionCode })),
      skipDuplicates: true,
    })
  )
  await insertChunks("cities/municipalities", cities, (chunk) =>
    db.psgcCity.createMany({
      data: chunk.map((c) => ({
        code: c.code,
        name: c.name,
        regionCode: c.regionCode,
        provinceCode: c.provinceCode || null,
      })),
      skipDuplicates: true,
    })
  )
  await insertChunks("barangays", barangays, (chunk) =>
    db.psgcBarangay.createMany({
      data: chunk.map((b) => ({ code: b.code, name: b.name, cityCode: (b.cityCode || b.municipalityCode) as string })),
      skipDuplicates: true,
    })
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
