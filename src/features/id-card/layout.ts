// ID card layout, measured from design/id-template/ID - Template.psd (1561 × 1008 px canvas).
// All coordinates below are in that template's pixel space; the renderer scales them.

// Template PNGs live in src/features/id-card/assets/ (not public/: the back has officers' signatures).

/** The artwork sits inside a 5 px transparent margin ("Background" layer 5,5 → 1557,1003). */
export const ARTWORK = { x: 5, y: 5, width: 1552, height: 998 }

/** CR80 card: 3.375 × 2.125 in. */
export const CARD_INCHES = { width: 3.375, height: 2.125 }

export const FRONT_LAYOUT = {
  // Inner area of the "ID Frame" layer (rounded top corners).
  photo: { x: 61, y: 383, width: 333, height: 436, radius: 26, bottomRadius: 14 },
  // Inner white area of the "QR Box" layer; the code is centred in it.
  qr: { x: 1128, y: 468, width: 333, height: 302, size: 280 },
  // Value text after the ":" columns. `baseline` comes from the PSD sample layers.
  text: {
    x: 770,
    maxWidth: 300, // up to the end of the underline
    color: "#013B32", // label colour in the template
    fontSize: 36, // Arial 36 in the template
    minFontSize: 24,
    rows: {
      name: { baseline: 495 },
      position: { baseline: 589 },
      tracking: { baseline: 681 },
      blockLot: { baseline: 779 },
    },
  },
} as const
