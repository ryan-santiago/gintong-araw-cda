import { randomBytes } from "node:crypto"

import { env } from "@/env"

// Each member card's QR is a link: <APP_URL>/m/<cardToken>. The token is 128 random bits
// (22 base64url chars) — unguessable, and rotated to cancel a lost card.

const TOKEN = /^[A-Za-z0-9_-]{22}$/

export function generateCardToken() {
  return randomBytes(16).toString("base64url")
}

export function cardUrl(token: string) {
  return `${env.APP_URL.replace(/\/+$/, "")}/m/${token}`
}

/** Extracts the card token from scanned QR text: a /m/<token> link (any host) or a bare token. */
export function parseCardToken(text: string): string | null {
  const value = text.trim()
  if (TOKEN.test(value)) return value
  const match = value.match(/\/m\/([A-Za-z0-9_-]{22})(?:[/?#]|$)/)
  return match ? match[1]! : null
}
