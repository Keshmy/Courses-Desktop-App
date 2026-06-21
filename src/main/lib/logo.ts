import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

/**
 * Built-in default logo shown before the center uploads its own.
 * Embedded as an inline SVG data URL so it always works offline and on first install.
 */
const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <path d="M64 32 L108 52 L64 72 L20 52 Z" fill="#ffffff"/>
  <path d="M40 62 L40 82 C40 92 88 92 88 82 L88 62 L64 72 Z" fill="#ffffff" opacity="0.88"/>
  <path d="M108 52 L108 78" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <circle cx="108" cy="82" r="5" fill="#fbbf24"/>
</svg>`

export const DEFAULT_LOGO_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  DEFAULT_LOGO_SVG
)}`

function normalizeLogoPath(logoPath: string): string {
  let path = logoPath.trim()
  if (path.startsWith('file://')) {
    path = decodeURIComponent(path.replace(/^file:\/\//, ''))
    if (/^\/[A-Za-z]:/.test(path)) path = path.slice(1)
  }
  return path
}

export function readLogoAsDataUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null

  const normalized = normalizeLogoPath(logoPath)
  if (!existsSync(normalized)) return null

  try {
    const ext = extname(normalized).toLowerCase()

    if (ext === '.svg') {
      const svg = readFileSync(normalized, 'utf8')
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    }

    const buffer = readFileSync(normalized)
    const mime = MIME_BY_EXT[ext] ?? 'image/png'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Returns the custom center logo when one is set and readable, otherwise the
 * built-in default logo. Always returns a usable data URL (works offline).
 */
export function getLogoDataUrlOrDefault(logoPath: string | null | undefined): string {
  return readLogoAsDataUrl(logoPath) ?? DEFAULT_LOGO_DATA_URL
}
