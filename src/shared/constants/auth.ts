/** Built-in administrator account created on first run. */
export const DEFAULT_ADMIN_USERNAME = 'admin'

export function isProtectedAdminUsername(username: string): boolean {
  return username.trim().toLowerCase() === DEFAULT_ADMIN_USERNAME
}
