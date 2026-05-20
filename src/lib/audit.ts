import { supabase } from './supabase'

type AuditAction =
  | 'login_failed'
  | 'login_success'
  | 'password_change'
  | 'account_delete'
  | 'avatar_upload'
  | 'display_name_change'

export async function logAuditEvent(
  action: AuditAction,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-audit-event`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, metadata }),
      },
    )
  } catch {
    // Audit logging is best-effort — never throw
  }
}
