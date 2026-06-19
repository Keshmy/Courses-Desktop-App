import { net } from 'electron'

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return net.fetch(url, init)
}
