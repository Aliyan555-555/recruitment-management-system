import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto"

/**
 * AES-256-GCM encryption for secrets stored in the database (e.g. AI API tokens).
 *
 * Key source: AI_SETTINGS_ENCRYPTION_KEY (preferred, dedicated key), falling back to
 * NEXTAUTH_SECRET. The key material is run through HKDF so any string length works.
 * Stored format: v1:<iv b64>:<auth tag b64>:<ciphertext b64>
 *
 * NOTE: rotating the key makes stored secrets undecryptable; admins must re-enter them.
 */

const VERSION = "v1"
const INFO = "rms-ai-settings-secret"

function getKey(): Buffer {
  const material = (process.env.AI_SETTINGS_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET ?? "").trim()
  if (material.length < 16) {
    throw new Error(
      "Encryption key is not configured. Set AI_SETTINGS_ENCRYPTION_KEY (or NEXTAUTH_SECRET) to a long random string."
    )
  }
  return Buffer.from(hkdfSync("sha256", material, "rms-salt-v1", INFO, 32))
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":")
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error("Unrecognised encrypted secret format")
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")
}

/** Last 4 chars only, for display. Never reveals enough to reconstruct the key. */
export function secretHint(secret: string): string {
  return secret.length > 8 ? secret.slice(-4) : ""
}
