import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000))
}

export function formatDate(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateTime(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Generates a unique job code based on organization alias
 * Format: {ORG_ALIAS}-{RANDOM_NUMBER}
 * Default: RMS-{RANDOM_NUMBER} if no alias provided
 */
export async function generateJobCode(organizationAlias?: string): Promise<string> {
  const alias = organizationAlias?.toUpperCase().slice(0, 10) || 'RMS'
  const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `${alias}-${randomNumber}`
}

