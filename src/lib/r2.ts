import "server-only"

import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { env } from "@/env"

const globalForR2 = globalThis as unknown as { r2?: S3Client }

function client() {
  globalForR2.r2 ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  })
  return globalForR2.r2
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys contain a content hash, so a key's bytes never change.
      CacheControl: "private, max-age=31536000, immutable",
    })
  )
}

export async function deleteObjects(keys: (string | null | undefined)[]) {
  const objects = keys.filter((k): k is string => !!k).map((Key) => ({ Key }))
  if (!objects.length) return
  await client().send(new DeleteObjectsCommand({ Bucket: env.R2_BUCKET, Delete: { Objects: objects, Quiet: true } }))
}

export async function getObjectBytes(key: string) {
  const res = await client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
  if (!res.Body) throw new Error(`Empty object: ${key}`)
  return Buffer.from(await res.Body.transformToByteArray())
}

const HOUR = 60 * 60 * 1000

/**
 * Short-lived link to a private object. The signing time is rounded down to the
 * hour so the URL stays identical for an hour and the browser can cache the image.
 */
export async function signedUrl(key: string) {
  const signingDate = new Date(Math.floor(Date.now() / HOUR) * HOUR)
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }), {
    expiresIn: 2 * 60 * 60, // valid until at least one hour from now
    signingDate,
  })
}

export async function signedUrls<T extends string | null | undefined>(keys: T[]) {
  return Promise.all(keys.map((k) => (k ? signedUrl(k) : null)))
}
