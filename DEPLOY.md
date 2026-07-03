# YouXP — Deploy notes (Phases 4 & 5)

Everything here is one-time setup for the data/infra work in Phases 4 and 5.
Run the steps in order. Client code degrades gracefully if a step is skipped
(missing table/function/key = feature silently falls back or hides), so nothing
breaks if you defer a piece — but the feature stays off until you finish it.

All SQL is in `migrations/` and is safe to re-run.

---

## Checklist (do these, in order)

- [ ] 1. Run `migrations/phase4-xp-aggregates.sql`
- [ ] 2. Run `migrations/phase4-user-preferences.sql`
- [ ] 3. Run `migrations/phase5-push-subscriptions.sql`
- [ ] 4. Generate VAPID keys
- [ ] 5. Set `VITE_VAPID_PUBLIC_KEY` in Vercel + `.env.local`, redeploy the app
- [ ] 6. Set Edge Function secrets (VAPID keys + subject)
- [ ] 7. Deploy the `send-notifications` Edge Function
- [ ] 8. Run `migrations/phase5-cron.sql` (fill in the two placeholders)
- [ ] 9. Test-send

---

## Phase 4 — Data & progression (SQL only)

### 1. XP aggregates function
Supabase SQL Editor → paste `migrations/phase4-xp-aggregates.sql` → Run.

Creates `get_xp_aggregates(uuid)` (SECURITY INVOKER, so RLS still applies). The
client calls this RPC and multiplies the counts by `XP_RATES` in TypeScript, so
rate changes stay retroactive. **If you skip this**, the client falls back to
computing XP from full table rows (current behavior) — no visible change, just
more data downloaded.

### 2. user_preferences table
Supabase SQL Editor → paste `migrations/phase4-user-preferences.sql` → Run.

Creates `user_preferences (user_id, prefs jsonb, updated_at)` with owner-only
RLS. Powers cross-device sync of theme/mode, Home stat picks, quest rerolls +
seen-template history, streak-freeze spent tokens, and (Phase 5) notification
settings. **If you skip this**, prefs stay localStorage-only (per-device); the
app works fine, nothing resets.

> On first load after this ships, existing `youxp-*` localStorage values are
> seeded into the prefs doc automatically (one-time, `youxp-prefs-seeded` flag),
> then pushed to the table — so no settings reset.

Nothing else is needed for Phase 4 (level cap + seasonal level + streak tokens
are pure client logic). Note: because XP recomputes from source, the level cap
change may bump the displayed level by one on first load — that's expected.

---

## Phase 5 — Push notifications

### 3. push_subscriptions table
Supabase SQL Editor → paste `migrations/phase5-push-subscriptions.sql` → Run.

Creates `push_subscriptions` (owner-only RLS; service_role reads all rows for
sending). Per-type toggles + quiet hours live inside `user_preferences.prefs`
under `notificationSettings`, not a separate table.

### 4. Generate VAPID keys
VAPID is the signing keypair that authorizes your server to push to browsers.
Generate once:

```bash
npx web-push generate-vapid-keys
```

Output looks like:

```
Public Key:
BJ...long-base64url...
Private Key:
k3...long-base64url...
```

Keep both. The **public** key ships to the browser; the **private** key is a
server secret — never put it in client env or commit it.

### 5. Client env var + redeploy
The push UI stays hidden until the public key is present.

- Vercel → Project → Settings → Environment Variables → add
  `VITE_VAPID_PUBLIC_KEY` = *(the public key)* for Production (+ Preview if you
  want). Redeploy so the new env is baked into the client bundle.
- Local dev: add to `.env.local`:
  ```
  VITE_VAPID_PUBLIC_KEY=BJ...your-public-key...
  ```

### 6. Edge Function secrets
The function signs pushes with the VAPID keys. Set them as function secrets
(install the Supabase CLI first if needed: `npm i -g supabase`, then
`supabase login` and `supabase link --project-ref <PROJECT_REF>`):

```bash
supabase secrets set VAPID_PUBLIC_KEY="BJ...your-public-key..."
supabase secrets set VAPID_PRIVATE_KEY="k3...your-private-key..."
supabase secrets set VAPID_SUBJECT="mailto:you@example.com"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do
not set them.

### 7. Deploy the Edge Function
From the repo root:

```bash
supabase functions deploy send-notifications --no-verify-jwt
```

`--no-verify-jwt` is required because pg_cron calls it with the service-role key
(not a user JWT). Confirm it deployed:

```bash
supabase functions list
```

### 8. Schedule it (pg_cron + pg_net)
Open `migrations/phase5-cron.sql`, replace the two placeholders:

- `<PROJECT_REF>` — your project ref (the subdomain in your Supabase URL)
- `<SERVICE_ROLE_KEY>` — Settings → API → `service_role` secret

Then paste into the SQL Editor and Run. It enables `pg_cron` + `pg_net` and
schedules an hourly POST to the function. The function decides per user whether
it's the right *local* hour to send, so hourly covers all timezones.

Verify:
```sql
select jobname, schedule from cron.job;
```

### 9. Test
1. In the app: Settings → **Push Notifications** → toggle **Enable push
   notifications** → allow the browser prompt. (If the section is missing, the
   VAPID public key isn't set in this build — recheck step 5.)
2. Confirm a row appears in `push_subscriptions` for your user.
3. Fire the function once immediately instead of waiting for the cron:
   ```bash
   curl -X POST "https://<PROJECT_REF>.functions.supabase.co/send-notifications" \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
     -H "Content-Type: application/json" -d '{}'
   ```
   The response is `{"sent":N}`. Note it only sends inside the relevant local
   time windows (weekly recap Mon 07–10; evening/streak/quest 19–22) and outside
   quiet hours — so for an on-demand smoke test, temporarily widen your quiet
   hours or test during an active window.

---

## Notes / gotchas

- **iOS**: web push requires the PWA be **installed to the Home Screen**
  (Add to Home Screen); Safari tabs don't receive push. Android/desktop Chrome
  work in a normal tab once installed or permitted.
- **Service worker**: push handlers live in `public/push-sw.js`, imported into
  the Workbox-generated SW via `workbox.importScripts` in `vite.config.ts`.
  Existing offline/precache behavior is unchanged.
- **Dedup**: each subscription row tracks `last_sent` per type per day, so the
  same notification won't fire twice in a day even with hourly cron runs.
- **Expired subscriptions**: the function deletes rows on 404/410 from the push
  service automatically.
- **Streak freeze tokens** (Phase 4e): tokens are earned deterministically from
  activity history (max 1/month, when any category logged in ≥3 distinct ISO
  weeks that month). Only *spent* dates are stored (in `user_preferences`), so
  the balance is reproducible on any device.
