export function cronAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false
  return authHeader === `Bearer ${secret}`
}
