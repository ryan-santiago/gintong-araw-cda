// Static preview data for the Phase 0 dashboard. Replaced by real queries in Phase 5.

export const sampleStats = {
  activeMembers: 487,
  lastMeetingRate: 77,
  lastMeetingDelta: 4.2,
  monthRate: 71,
  newThisMonth: 12,
  awaitingIdCards: 3,
  withPhotos: 452,
  idsIssued: 431,
}

export const sampleTrend = [
  { label: "Aug 23", present: 302 },
  { label: "Aug 30", present: 341 },
  { label: "Sep 6", present: 283 },
  { label: "Sep 13", present: 360 },
  { label: "Sep 20", present: 321 },
  { label: "Sep 27", present: 394 },
  { label: "Oct 4", present: 375 },
  { label: "Oct 11", present: 214, live: true },
]

export const sampleNextMeeting = {
  title: "General Assembly",
  dateLabel: "Sun, Oct 11",
  time: "8:00 AM",
  location: "Covered Court, Brgy. San Isidro",
  checkedIn: 214,
  status: "OPEN" as const,
}

export const sampleAtRisk = [
  { name: "Maria L. Dizon", tracking: "2026-0142", blockLot: "Blk 4 Lot 12", missed: 5, initials: "MD" },
  { name: "Jose P. Ramos Jr.", tracking: "2026-0088", blockLot: "Blk 2 Lot 3", missed: 4, initials: "JR" },
  { name: "Andrea S. Villanueva", tracking: "2026-0310", blockLot: "Blk 9 Lot 1", missed: 3, initials: "AV" },
]

export const sampleCheckIns = [
  {
    name: "Juan D. Dela Cruz",
    tracking: "2026-0001",
    blockLot: "Blk 1 · Lot 5",
    time: "8:42 AM",
    method: "QR",
    initials: "JD",
  },
  {
    name: "Rosario M. Mendoza",
    tracking: "2026-0217",
    blockLot: "Blk 6 · Lot 22",
    time: "8:41 AM",
    method: "QR",
    initials: "RM",
  },
  {
    name: "Eduardo B. Bautista",
    tracking: "2026-0095",
    blockLot: "Blk 3 · Lot 9",
    time: "8:39 AM",
    method: "Manual",
    initials: "EB",
  },
  {
    name: "Liza C. Garcia",
    tracking: "2026-0433",
    blockLot: "Blk 11 · Lot 2",
    time: "8:37 AM",
    method: "QR",
    initials: "LG",
  },
] as const
