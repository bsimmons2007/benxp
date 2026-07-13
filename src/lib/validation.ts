// Basic profanity wordlist — add terms as needed
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'nigger', 'nigga',
  'faggot', 'fag', 'whore', 'slut', 'bastard', 'retard', 'retarded',
]

const BLOCKED_RE = new RegExp(
  BLOCKED_WORDS.map(w => w.replace(/./g, c => `[${c}]`)).join('|'),
  'i',
)

export function containsProfanity(text: string): boolean {
  return BLOCKED_RE.test(text)
}

// Strip HTML tags and null bytes from user-supplied strings
export function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')    // strip HTML tags
    // eslint-disable-next-line no-control-regex -- stripping null bytes is the point
    .replace(/\x00/g, '')
    .trim()
}

export function validateDisplayName(name: string): string | null {
  const clean = sanitizeText(name)
  if (clean.length < 1)  return 'Display name is required.'
  if (clean.length > 32) return 'Display name must be 32 characters or fewer.'
  if (containsProfanity(clean)) return 'Display name contains prohibited content.'
  if (!/^[\w\s\-'.]+$/.test(clean)) return 'Display name may only contain letters, numbers, spaces, hyphens, apostrophes, and periods.'
  return null
}

export function validateNote(note: string): string | null {
  const clean = sanitizeText(note)
  if (clean.length > 500) return 'Note must be 500 characters or fewer.'
  return null
}
