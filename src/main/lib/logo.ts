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
