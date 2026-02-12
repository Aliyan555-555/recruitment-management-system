import { v2 as cloudinary } from "cloudinary"

export const CLOUDINARY = {
  FOLDERS: {
    ORGANIZATION_LOGOS: "organization-logos",
    AVATARS: "avatars",
  },
  /** Max file size in bytes (2MB) */
  MAX_FILE_SIZE: 2 * 1024 * 1024,
  /** Allowed MIME types for logos and avatars */
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
  ] as const,
} as const

export type CloudinaryUploadFolder = (typeof CLOUDINARY.FOLDERS)[keyof typeof CLOUDINARY.FOLDERS]

export interface CloudinaryUploadOptions {
  folder: CloudinaryUploadFolder
  /** Optional public_id prefix (e.g. "org", "user-123") */
  publicIdPrefix?: string
  /** Override allowed MIME types for this upload */
  allowedMimeTypes?: readonly string[]
  /** Override max file size in bytes */
  maxFileSize?: number
}

export interface CloudinaryUploadResult {
  secureUrl: string
  publicId: string
  width?: number
  height?: number
}

export interface CloudinaryValidationError {
  code: "INVALID_TYPE" | "FILE_TOO_LARGE" | "MISSING_CONFIG"
  message: string
}

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  return { cloudName, apiKey, apiSecret }
}

export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = getConfig()
  return !!(cloudName && apiKey && apiSecret)
}

/**
 * Validate file before upload. Returns error object if invalid.
 */
export function validateImageFile(
  file: { type: string; size: number },
  options: { maxFileSize?: number; allowedMimeTypes?: readonly string[] } = {}
): CloudinaryValidationError | null {
  const { cloudName } = getConfig()
  if (!cloudName) {
    return { code: "MISSING_CONFIG", message: "Cloudinary is not configured." }
  }

  const allowed = options.allowedMimeTypes ?? CLOUDINARY.ALLOWED_MIME_TYPES
  const maxSize = options.maxFileSize ?? CLOUDINARY.MAX_FILE_SIZE

  if (!allowed.includes(file.type)) {
    return {
      code: "INVALID_TYPE",
      message: `Invalid file type. Allowed: ${allowed.join(", ")}`,
    }
  }

  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1)
    return {
      code: "FILE_TOO_LARGE",
      message: `File size must be under ${maxMB}MB.`,
    }
  }

  return null
}

/**
 * Upload an image buffer to Cloudinary. Uses configured env vars.
 * Returns secure_url and publicId, or throws with a clear error.
 */
export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getConfig()

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.")
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  const allowed = options.allowedMimeTypes ?? CLOUDINARY.ALLOWED_MIME_TYPES
  if (!allowed.includes(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed: ${allowed.join(", ")}`)
  }

  const extension = mimeType.split("/")[1]?.replace("svg+xml", "svg") ?? "jpg"
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`

  const publicId = options.publicIdPrefix
    ? `${options.folder}/${options.publicIdPrefix}-${Date.now()}`
    : `${options.folder}/${Date.now()}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: options.folder,
    public_id: publicId.split("/").pop(),
    overwrite: true,
    resource_type: "image",
    ...(extension === "svg" && { resource_type: "image" }),
  })

  if (!result.secure_url) {
    throw new Error("Cloudinary upload did not return a URL.")
  }

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id ?? "",
    width: result.width,
    height: result.height,
  }
}

/**
 * Delete an image by public_id (e.g. from upload result). Use when replacing logos/avatars.
 */
export async function deleteImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return

  const { cloudName, apiKey, apiSecret } = getConfig()
  cloudinary.config({
    cloud_name: cloudName!,
    api_key: apiKey!,
    api_secret: apiSecret!,
  })

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" })
}
