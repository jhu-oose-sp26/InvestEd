/** Public label for leaderboards and profile: username → display name → account number. */
export function publicAccountLabel(u: {
  username: string | null
  name: string | null
  accountNumber: string
}): string {
  const uName = u.username?.trim()
  if (uName) return uName
  const n = u.name?.trim()
  if (n) return n
  return u.accountNumber
}
