type NameParts = {
  firstName: string
  middleName?: string | null
  lastName: string
  suffix?: string | null
}

/** "Juan D. Dela Cruz Jr." — middle name shortened to an initial. */
export function fullName({ firstName, middleName, lastName, suffix }: NameParts) {
  const middle = middleName?.trim() ? `${middleName.trim()[0]!.toUpperCase()}.` : ""
  return [firstName, middle, lastName, suffix]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ")
}

export function memberInitials({ firstName, lastName }: NameParts) {
  return `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase() || "?"
}
