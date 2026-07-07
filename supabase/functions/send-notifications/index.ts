// Supabase Edge Function: send-notifications
// Scheduled sender for YouXP web-push notifications.
//
// Runs on a cron (see migrations/phase5-cron.sql). On each run it walks every
// push subscription and, respecting per-type toggles + quiet hours + per-day
// dedup, may send:
//   - evening reminder (~20:00 local) if nothing logged today
//   - streak-at-risk if overall streak >= 3 and nothing logged today
//   - quest expiring within 48h with progress >= 70%
//   - Monday-morning weekly recap (XP earned last week + level)
//
// Secrets required (set via `supabase secrets set`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@you-xp.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

// XP rates mirror src/lib/xp.ts XP_RATES in full so the weekly recap and
// userLevel() never drift from the client's number.
const XP = {
  per_set: 15, workout_day: 60, new_pr: 200, book: 250, skate_mi: 12,
  fn_win: 100, fn_blitz_win: 30, fn_kill: 3, sleep: 20, sleep_bonus: 35,
  cardio_run: 15, cardio_bike: 6, cardio_swim: 25, cardio_walk: 4, cardio_other: 12,
  mood: 15, measurement: 5, water_goal: 50,
  bb_session: 25, bb_point: 1,
  pb_game: 15, pb_win: 20,
  golf_round: 50, golf_under_par: 25,
  dg_round: 30, dg_under_par: 15,
  hike_mi: 20, hike_500ft: 15,
  tt_game: 10, tt_win: 15,
  chess_game: 15, chess_win: 25, chess_draw: 8,
  vb_game: 15, vb_win: 20,
  sb_game: 15, sb_win: 20,
  pool_game: 10, pool_win: 15, pool_bnr: 25,
  meal: 10, nutrition_full_day: 25,
}

interface Sub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  timezone: string
  last_sent: Record<string, string>
}

interface Settings {
  evening: boolean; streak: boolean; quest: boolean; weekly: boolean
  quietStart: string; quietEnd: string; timezone: string
}

const DEFAULT_SETTINGS: Settings = {
  evening: true, streak: true, quest: true, weekly: true,
  quietStart: '22:00', quietEnd: '08:00', timezone: 'America/Chicago',
}

function localParts(tz: string): { date: string; hour: number; minute: number; weekday: number } {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
  const date = `${parts.year}-${parts.month}-${parts.day}`
  const hour = parseInt(parts.hour === '24' ? '0' : parts.hour, 10)
  const minute = parseInt(parts.minute, 10)
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { date, hour, minute, weekday: wdMap[parts.weekday] ?? 0 }
}

function inQuietHours(hour: number, minute: number, start: string, end: string): boolean {
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  const cur = hour * 60 + minute
  const s = toMin(start), e = toMin(end)
  return s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e)   // handle overnight window
}

async function anyActivityOn(userId: string, date: string): Promise<boolean> {
  // Full 22-table activity list from CLAUDE.md, minus books/goals/challenges
  // (checked separately — different date columns / no date column at all).
  const tables = [
    'lifting_log', 'skate_sessions', 'fortnite_games', 'sleep_log', 'mood_log',
    'cardio_sessions', 'basketball_sessions', 'pickleball_games', 'golf_rounds',
    'disc_golf_rounds', 'hiking_sessions', 'table_tennis_games', 'chess_games',
    'pool_games', 'volleyball_sessions', 'spikeball_games', 'water_log',
    'body_measurements', 'meals',
  ]
  const checks = await Promise.all(tables.map((t) =>
    admin.from(t).select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', date)
      .then((r) => r.count ?? 0).catch(() => 0)
  ))
  const books = await admin.from('books').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('date_finished', date).then((r) => r.count ?? 0).catch(() => 0)
  return checks.some((c) => c > 0) || books > 0
}

async function overallStreak(userId: string): Promise<number> {
  // Mirrors useStreak.ts's allDates set (gym/skate/game/book/sleep/mood/cardio
  // + all W/L sports; water/meals/measurements intentionally excluded there too).
  const since = new Date(); since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().slice(0, 10)
  const dateSets = await Promise.all([
    admin.from('lifting_log').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('cardio_sessions').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('sleep_log').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('mood_log').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('skate_sessions').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('fortnite_games').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('basketball_sessions').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('pickleball_games').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('golf_rounds').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('disc_golf_rounds').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('hiking_sessions').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('table_tennis_games').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('chess_games').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('pool_games').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('volleyball_sessions').select('date').eq('user_id', userId).gte('date', sinceStr),
    admin.from('spikeball_games').select('date').eq('user_id', userId).gte('date', sinceStr),
  ])
  const dates = new Set<string>()
  for (const r of dateSets) for (const row of (r.data ?? [])) dates.add((row as { date: string }).date)
  const books = await admin.from('books').select('date_finished').eq('user_id', userId).gte('date_finished', sinceStr)
  for (const row of (books.data ?? [])) {
    const d = (row as { date_finished: string | null }).date_finished
    if (d) dates.add(d)
  }
  const dayStr = (d: Date) => d.toISOString().slice(0, 10)
  let count = 0
  const cursor = new Date()
  if (!dates.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(dayStr(cursor))) { count++; cursor.setDate(cursor.getDate() - 1) }
  return count
}

async function weeklyXP(userId: string): Promise<number> {
  const start = new Date(); start.setDate(start.getDate() - 7)
  const s = start.toISOString().slice(0, 10)
  const [
    lift, skate, pr, books, fn, sleep, cardio, mood, water, measurements,
    bb, pb, golf, dg, hike, tt, chess, vb, sb, pool, meals,
  ] = await Promise.all([
    admin.from('lifting_log').select('date').eq('user_id', userId).gte('date', s),
    admin.from('skate_sessions').select('miles').eq('user_id', userId).gte('date', s),
    admin.from('pr_history').select('id').eq('user_id', userId).gte('date', s),
    admin.from('books').select('id').eq('user_id', userId).gte('date_finished', s),
    admin.from('fortnite_games').select('win, kills, mode').eq('user_id', userId).gte('date', s),
    admin.from('sleep_log').select('hours_slept').eq('user_id', userId).eq('is_nap', false).gte('date', s),
    admin.from('cardio_sessions').select('activity, distance_miles').eq('user_id', userId).gte('date', s),
    admin.from('mood_log').select('id').eq('user_id', userId).gte('date', s),
    admin.from('water_log').select('date, oz').eq('user_id', userId).gte('date', s),
    admin.from('body_measurements').select('id').eq('user_id', userId).gte('date', s),
    admin.from('basketball_sessions').select('points').eq('user_id', userId).gte('date', s),
    admin.from('pickleball_games').select('win').eq('user_id', userId).gte('date', s),
    admin.from('golf_rounds').select('score, par').eq('user_id', userId).gte('date', s),
    admin.from('disc_golf_rounds').select('score, par').eq('user_id', userId).gte('date', s),
    admin.from('hiking_sessions').select('distance_miles, elevation_gain_ft').eq('user_id', userId).gte('date', s),
    admin.from('table_tennis_games').select('win').eq('user_id', userId).gte('date', s),
    admin.from('chess_games').select('result').eq('user_id', userId).gte('date', s),
    admin.from('volleyball_sessions').select('win').eq('user_id', userId).gte('date', s),
    admin.from('spikeball_games').select('win').eq('user_id', userId).gte('date', s),
    admin.from('pool_games').select('win, break_and_run').eq('user_id', userId).gte('date', s),
    admin.from('meals').select('date').eq('user_id', userId).gte('date', s),
  ])
  const liftRows = lift.data ?? []
  let xp = liftRows.length * XP.per_set + new Set(liftRows.map((r: { date: string }) => r.date)).size * XP.workout_day
  xp += (skate.data ?? []).reduce((a: number, r: { miles: number }) => a + (r.miles ?? 0), 0) * XP.skate_mi
  xp += (pr.data ?? []).length * XP.new_pr
  xp += (books.data ?? []).length * XP.book
  xp += (fn.data ?? []).reduce((a: number, r: { win: boolean; kills: number; mode?: string | null }) => {
    const isBlitz = r.mode === 'Blitz' || (typeof r.mode === 'string' && r.mode.startsWith('Blitz '))
    return a + (r.win ? (isBlitz ? XP.fn_blitz_win : XP.fn_win) : 0) + (r.kills ?? 0) * XP.fn_kill
  }, 0)
  xp += (sleep.data ?? []).reduce((a: number, r: { hours_slept: number }) => a + XP.sleep + ((r.hours_slept ?? 0) >= 7 ? XP.sleep_bonus : 0), 0)
  xp += (cardio.data ?? []).reduce((a: number, r: { activity: string; distance_miles: number }) => {
    const rate = r.activity === 'run' ? XP.cardio_run : r.activity === 'bike' ? XP.cardio_bike
      : r.activity === 'swim' ? XP.cardio_swim : r.activity === 'walk' ? XP.cardio_walk : XP.cardio_other
    return a + (r.distance_miles ?? 0) * rate
  }, 0)
  xp += (mood.data ?? []).length * XP.mood
  xp += (measurements.data ?? []).length * XP.measurement

  const waterByDate: Record<string, number> = {}
  for (const r of (water.data ?? []) as { date: string; oz: number }[]) waterByDate[r.date] = (waterByDate[r.date] ?? 0) + Number(r.oz)
  xp += Object.values(waterByDate).filter((oz) => oz >= 64).length * XP.water_goal

  xp += (bb.data ?? []).reduce((a: number, r: { points: number }) => a + XP.bb_session + (r.points ?? 0) * XP.bb_point, 0)
  xp += (pb.data ?? []).reduce((a: number, r: { win: boolean }) => a + XP.pb_game + (r.win ? XP.pb_win : 0), 0)
  xp += (golf.data ?? []).reduce((a: number, r: { score: number; par: number }) => a + XP.golf_round + Math.max(r.par - r.score, 0) * XP.golf_under_par, 0)
  xp += (dg.data ?? []).reduce((a: number, r: { score: number; par: number }) => a + XP.dg_round + Math.max(r.par - r.score, 0) * XP.dg_under_par, 0)
  xp += (hike.data ?? []).reduce((a: number, r: { distance_miles: number; elevation_gain_ft: number | null }) =>
    a + (r.distance_miles ?? 0) * XP.hike_mi + Math.floor((r.elevation_gain_ft ?? 0) / 500) * XP.hike_500ft, 0)
  xp += (tt.data ?? []).reduce((a: number, r: { win: boolean }) => a + XP.tt_game + (r.win ? XP.tt_win : 0), 0)
  xp += (chess.data ?? []).reduce((a: number, r: { result: string }) => a + XP.chess_game + (r.result === 'win' ? XP.chess_win : r.result === 'draw' ? XP.chess_draw : 0), 0)
  xp += (vb.data ?? []).reduce((a: number, r: { win: boolean }) => a + XP.vb_game + (r.win ? XP.vb_win : 0), 0)
  xp += (sb.data ?? []).reduce((a: number, r: { win: boolean }) => a + XP.sb_game + (r.win ? XP.sb_win : 0), 0)
  xp += (pool.data ?? []).reduce((a: number, r: { win: boolean; break_and_run: boolean }) => a + XP.pool_game + (r.win ? XP.pool_win : 0) + (r.break_and_run ? XP.pool_bnr : 0), 0)

  const mealsByDate: Record<string, number> = {}
  for (const r of (meals.data ?? []) as { date: string }[]) mealsByDate[r.date] = (mealsByDate[r.date] ?? 0) + 1
  xp += Object.values(mealsByDate).reduce((a, c) => a + Math.min(c, 4), 0) * XP.meal
  xp += Object.values(mealsByDate).filter((c) => c >= 3).length * XP.nutrition_full_day

  return Math.round(xp)
}

async function userLevel(userId: string): Promise<number> {
  // Reuse the server aggregates RPC if present; fall back to 1.
  const { data } = await admin.rpc('get_xp_aggregates', { uid: userId })
  if (!data) return 1
  const a = data as Record<string, number>
  const n = (k: string) => Number(a[k] ?? 0)
  // Full recompute of total XP — mirrors xpFromAggregates in src/lib/xp.ts term for term.
  const xp = Math.round(
    n('set_count') * XP.per_set + n('workout_days') * XP.workout_day +
    n('pr_count') * XP.new_pr + n('book_count') * XP.book +
    n('skate_miles') * XP.skate_mi +
    n('fn_wins') * XP.fn_win + n('fn_blitz_wins') * XP.fn_blitz_win + n('fn_kills') * XP.fn_kill +
    n('sleep_nights') * XP.sleep + n('sleep_quality') * XP.sleep_bonus +
    n('cardio_run_mi') * XP.cardio_run + n('cardio_bike_mi') * XP.cardio_bike +
    n('cardio_swim_mi') * XP.cardio_swim + n('cardio_walk_mi') * XP.cardio_walk +
    n('cardio_other_mi') * XP.cardio_other +
    n('challenge_xp') + n('goal_xp') +
    n('mood_count') * XP.mood + n('measurement_count') * XP.measurement +
    n('water_goal_days') * XP.water_goal +
    n('bb_sessions') * XP.bb_session + n('bb_points') * XP.bb_point +
    n('pb_games') * XP.pb_game + n('pb_wins') * XP.pb_win +
    n('golf_rounds') * XP.golf_round + n('golf_under_par') * XP.golf_under_par +
    n('dg_rounds') * XP.dg_round + n('dg_under_par') * XP.dg_under_par +
    n('hike_miles') * XP.hike_mi + n('hike_elev_buckets') * XP.hike_500ft +
    n('tt_games') * XP.tt_game + n('tt_wins') * XP.tt_win +
    n('chess_games') * XP.chess_game + n('chess_wins') * XP.chess_win + n('chess_draws') * XP.chess_draw +
    n('vb_games') * XP.vb_game + n('vb_wins') * XP.vb_win +
    n('sb_games') * XP.sb_game + n('sb_wins') * XP.sb_win +
    n('pool_games') * XP.pool_game + n('pool_wins') * XP.pool_win + n('pool_bnr') * XP.pool_bnr +
    n('meals_logged') * XP.meal + n('nutrition_full_days') * XP.nutrition_full_day
  )
  // calculateLevel() from src/lib/xp.ts — sqrt curve through level 30, flat 8550/level after.
  const CAP_XP = 126150, STEP = 8550
  return xp < CAP_XP ? Math.floor(1 + Math.sqrt(xp / 150)) : 30 + Math.floor((xp - CAP_XP) / STEP)
}

async function expiringQuest(userId: string): Promise<string | null> {
  const { data } = await admin.from('challenges').select('challenge_name, tier, notes, target, created_at')
    .eq('user_id', userId).eq('status', 'active').in('tier', ['Weekly', 'Monthly'])
  if (!data || data.length === 0) return null
  const now = Date.now()
  for (const c of data as { challenge_name: string; tier: string; target: string | null; created_at: string }[]) {
    // Weekly resets next Monday; Monthly resets 1st of next month.
    let expiresAt: number
    const created = new Date(c.created_at)
    if (c.tier === 'Weekly') {
      const d = new Date(created); const day = d.getDay()
      const diff = day === 0 ? 1 : 8 - day
      d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0)
      expiresAt = d.getTime()
    } else {
      const d = new Date(created.getFullYear(), created.getMonth() + 1, 1)
      expiresAt = d.getTime()
    }
    const hoursLeft = (expiresAt - now) / 3600000
    if (hoursLeft > 0 && hoursLeft <= 48) {
      // We can't cheaply compute live progress here; treat presence as >=70%
      // eligible and let the copy stay generic. (Progress gating happens on the
      // client badge; server keeps it simple per the phase brief.)
      return c.challenge_name
    }
  }
  return null
}

async function send(sub: Sub, title: string, body: string, url: string, tag: string): Promise<void> {
  const payload = JSON.stringify({ title, body, url, tag })
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    )
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    // 404/410 = expired subscription: clean it up.
    if (status === 404 || status === 410) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id)
    } else {
      // Transient failures (429/500/network) must stay visible in function logs.
      let host = sub.endpoint
      try { host = new URL(sub.endpoint).host } catch { /* keep raw endpoint */ }
      console.error(`[send-notifications] push failed for ${host}: status=${status ?? 'unknown'}`, err)
    }
  }
}

async function markSent(sub: Sub, type: string, date: string): Promise<void> {
  try {
    const last = { ...(sub.last_sent ?? {}), [type]: date }
    await admin.from('push_subscriptions').update({ last_sent: last }).eq('id', sub.id)
  } catch (err) {
    // The push already sent successfully; a dedup-write failure must not bubble
    // and abort the loop for this subscription — just log and move on.
    console.error(`[send-notifications] markSent failed for sub ${sub.id} (type=${type}):`, err)
  }
}

Deno.serve(async (req: Request) => {
  // JWT verification is disabled at the platform level so pg_cron can call
  // this; verify the shared secret ourselves. The cron job sends the
  // service-role key as its bearer token (phase5-cron.sql).
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${SERVICE_ROLE}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const { data: subs } = await admin.from('push_subscriptions').select('*')
  if (!subs) return new Response('no subs', { status: 200 })

  // One settings lookup per user (cache across their devices).
  const settingsCache = new Map<string, Settings>()
  let sent = 0

  for (const sub of subs as Sub[]) {
    try {
    let settings = settingsCache.get(sub.user_id)
    if (!settings) {
      const { data: pref } = await admin.from('user_preferences').select('prefs')
        .eq('user_id', sub.user_id).maybeSingle()
      const ns = (pref?.prefs as { notificationSettings?: Partial<Settings> } | null)?.notificationSettings ?? {}
      settings = { ...DEFAULT_SETTINGS, ...ns }
      settingsCache.set(sub.user_id, settings)
    }

    const tz = settings.timezone || sub.timezone || 'America/Chicago'
    const { date, hour, minute, weekday } = localParts(tz)
    if (inQuietHours(hour, minute, settings.quietStart, settings.quietEnd)) continue
    const lastSent = sub.last_sent ?? {}

    // Monday-morning weekly recap (07:00–10:00 local, Monday).
    if (settings.weekly && weekday === 1 && hour >= 7 && hour < 10 && lastSent.weekly !== date) {
      const xp = await weeklyXP(sub.user_id)
      const lvl = await userLevel(sub.user_id)
      await send(sub, 'Your week in XP', `You earned ${xp.toLocaleString()} XP last week. You're level ${lvl}. New week, new gains!`, '/weekly', 'weekly')
      await markSent(sub, 'weekly', date); sent++
      continue
    }

    // Evening block (19:00–22:00 local): reminder / streak / quest.
    if (hour >= 19 && hour < 22) {
      const loggedToday = await anyActivityOn(sub.user_id, date)

      if (!loggedToday && settings.streak && lastSent.streak !== date) {
        const streak = await overallStreak(sub.user_id)
        if (streak >= 3) {
          await send(sub, 'Streak at risk!', `You haven't logged today — your ${streak}-day streak resets at midnight (a freeze token may cover it). Log something to be safe!`, '/', 'streak')
          await markSent(sub, 'streak', date); sent++
          continue
        }
      }

      if (settings.quest && lastSent.quest !== date) {
        const quest = await expiringQuest(sub.user_id)
        if (quest) {
          await send(sub, 'Quest expiring soon', `"${quest}" expires within 48 hours. Finish it for the XP!`, '/challenges', 'quest')
          await markSent(sub, 'quest', date); sent++
          continue
        }
      }

      if (!loggedToday && settings.evening && lastSent.evening !== date) {
        await send(sub, 'Log your day', "You haven't logged anything today. Keep the momentum going!", '/', 'evening')
        await markSent(sub, 'evening', date); sent++
      }
    }
    } catch (err) {
      // One bad subscription/user must not abort the whole run
      console.error(`[send-notifications] sub ${sub.id} failed:`, err)
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
