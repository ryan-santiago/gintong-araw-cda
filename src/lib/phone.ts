import { parsePhoneNumberFromString } from "libphonenumber-js/min"

/** "0917 123 4567", "+63 917…", "9171234567" → "+639171234567"; null when not a valid PH number. */
export function normalizePhone(input: string): string | null {
  const phone = parsePhoneNumberFromString(input.trim(), "PH")
  return phone?.isValid() ? phone.number : null
}

/** "+639171234567" → "0917 123 4567" */
export function formatPhone(e164: string | null | undefined) {
  if (!e164) return ""
  const phone = parsePhoneNumberFromString(e164, "PH")
  return phone ? phone.formatNational() : e164
}
