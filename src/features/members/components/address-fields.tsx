"use client"

import { useEffect, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"

import { Combobox, type ComboboxOption } from "@/components/shared/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { MemberInput } from "@/features/members/schema"

type Item = { code: string; name: string }
const toOptions = (items: Item[]): ComboboxOption[] => items.map((i) => ({ value: i.code, label: i.name }))

// Lists are cached per session; they rarely change.
const cache = new Map<string, unknown>()
async function fetchJson<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load address list")
  const data = (await res.json()) as T
  cache.set(url, data)
  return data
}

function useList<T>(url: string | null, fallback: T) {
  const [state, setState] = useState<{ url: string | null; data: T }>({ url: null, data: fallback })
  useEffect(() => {
    if (!url) return
    let cancelled = false
    fetchJson<T>(url)
      .then((data) => !cancelled && setState({ url, data }))
      .catch(() => !cancelled && setState({ url, data: fallback }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback is a constant per call site
  }, [url])
  const ready = !url || state.url === url
  return { data: url && ready ? state.data : fallback, loading: !!url && !ready }
}

const NONE = "none"

export function AddressFields() {
  const { control, setValue, register, formState } = useFormContext<MemberInput>()
  const [regionCode, provinceCode, cityCode, barangayCode] = useWatch({
    control,
    name: ["regionCode", "provinceCode", "cityCode", "barangayCode"],
  })
  const errors = formState.errors

  const regions = useList<Item[]>("/api/psgc?level=regions", [])
  const provinces = useList<{ provinces: Item[]; independentCities: boolean }>(
    regionCode ? `/api/psgc?level=provinces&region=${regionCode}` : null,
    { provinces: [], independentCities: false }
  )
  const noProvinces = !!regionCode && !provinces.loading && provinces.data.provinces.length === 0
  const effectiveProvince = noProvinces ? NONE : provinceCode
  const cities = useList<Item[]>(
    regionCode && effectiveProvince
      ? `/api/psgc?level=cities&region=${regionCode}&province=${effectiveProvince}`
      : null,
    []
  )
  const barangays = useList<Item[]>(cityCode ? `/api/psgc?level=barangays&city=${cityCode}` : null, [])

  const provinceOptions = [
    ...toOptions(provinces.data.provinces),
    ...(provinces.data.independentCities && !noProvinces ? [{ value: NONE, label: "Independent cities" }] : []),
  ]

  const set = (name: keyof MemberInput, value: string) =>
    setValue(name, value, { shouldDirty: true, shouldValidate: formState.isSubmitted })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" data-invalid={!!errors.addressLine}>
        <FieldLabel htmlFor="addressLine">House / unit no., street, subdivision</FieldLabel>
        <Input id="addressLine" placeholder="e.g. 12 Sampaguita St., Phase 2" {...register("addressLine")} />
        <FieldError errors={[errors.addressLine]} />
      </Field>

      <Field data-invalid={!!errors.regionCode}>
        <FieldLabel htmlFor="regionCode">Region</FieldLabel>
        <Combobox
          id="regionCode"
          options={toOptions(regions.data)}
          value={regionCode}
          loading={regions.loading}
          invalid={!!errors.regionCode}
          placeholder="Choose region"
          searchPlaceholder="Search region…"
          onChange={(v) => {
            set("regionCode", v)
            set("provinceCode", "")
            set("cityCode", "")
            set("barangayCode", "")
          }}
        />
        <FieldError errors={[errors.regionCode]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="provinceCode">Province</FieldLabel>
        <Combobox
          id="provinceCode"
          options={provinceOptions}
          value={noProvinces ? "" : provinceCode}
          loading={provinces.loading}
          disabled={!regionCode || noProvinces}
          placeholder={noProvinces ? "No provinces (e.g. NCR)" : "Choose province"}
          searchPlaceholder="Search province…"
          onChange={(v) => {
            set("provinceCode", v)
            set("cityCode", "")
            set("barangayCode", "")
          }}
        />
      </Field>

      <Field data-invalid={!!errors.cityCode}>
        <FieldLabel htmlFor="cityCode">City / Municipality</FieldLabel>
        <Combobox
          id="cityCode"
          options={toOptions(cities.data)}
          value={cityCode}
          loading={cities.loading}
          disabled={!regionCode || (!noProvinces && !provinceCode)}
          invalid={!!errors.cityCode}
          placeholder="Choose city / municipality"
          searchPlaceholder="Search city…"
          onChange={(v) => {
            set("cityCode", v)
            set("barangayCode", "")
          }}
        />
        <FieldError errors={[errors.cityCode]} />
      </Field>

      <Field data-invalid={!!errors.barangayCode}>
        <FieldLabel htmlFor="barangayCode">Barangay</FieldLabel>
        <Combobox
          id="barangayCode"
          options={toOptions(barangays.data)}
          value={barangayCode}
          loading={barangays.loading}
          disabled={!cityCode}
          invalid={!!errors.barangayCode}
          placeholder="Choose barangay"
          searchPlaceholder="Search barangay…"
          onChange={(v) => set("barangayCode", v)}
        />
        <FieldError errors={[errors.barangayCode]} />
      </Field>

      <Field data-invalid={!!errors.zipCode}>
        <FieldLabel htmlFor="zipCode">ZIP code</FieldLabel>
        <Input id="zipCode" inputMode="numeric" maxLength={4} placeholder="e.g. 1100" {...register("zipCode")} />
        <FieldError errors={[errors.zipCode]} />
      </Field>
    </div>
  )
}
