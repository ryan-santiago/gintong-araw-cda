// Association positions, in order of seniority. Values match the MemberPosition enum.
export const MEMBER_POSITIONS = [
  { value: "PRESIDENT", label: "President" },
  { value: "VICE_PRESIDENT", label: "Vice-President" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "BOARD_MEMBER", label: "Board Member" },
  { value: "LEGAL_ATTORNEY", label: "Legal – Attorney" },
  { value: "LEGAL_SECRETARY", label: "Legal – Secretary" },
  { value: "MEMBER", label: "Member" },
] as const

export type MemberPositionValue = (typeof MEMBER_POSITIONS)[number]["value"]

export const POSITION_VALUES = MEMBER_POSITIONS.map((p) => p.value) as [MemberPositionValue, ...MemberPositionValue[]]

export function positionLabel(value: string) {
  return MEMBER_POSITIONS.find((p) => p.value === value)?.label ?? value
}

export function isOfficer(value: string) {
  return value !== "MEMBER"
}
