import { supabaseClient, supabaseConfigured } from './supabase.js'

/**
 * Inserts a row into `public.user_events` for the current authenticated user.
 * Fire-and-forget: failures are logged to the console only and never thrown.
 *
 * Expected table shape (adjust if your migration differs):
 * - user_id uuid (auth user)
 * - event_name text
 * - status text
 * - metadata jsonb (optional)
 *
 * @param {string} eventName e.g. 'login', 'analysis_start'
 * @param {string} status e.g. 'success', 'error', 'started'
 * @param {Record<string, unknown>} [metadata]
 */
export async function logUserEvent(eventName, status, metadata = {}) {
  if (!supabaseConfigured || !supabaseClient) return

  const { data: authData, error: authError } = await supabaseClient.auth.getUser()
  const uid = authData?.user?.id
  if (authError || !uid) return

  const meta =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}

  try {
    const { error } = await supabaseClient.from('user_events').insert({
      user_id: uid,
      event_name: eventName,
      status,
      metadata: meta,
    })
    if (error) {
      console.warn('[user_events]', error.message)
    }
  } catch (e) {
    console.warn('[user_events]', e instanceof Error ? e.message : String(e))
  }
}
