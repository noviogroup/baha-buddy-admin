# Baha Buddy Admin — Netlify Deployment Runbook

> Site ID: `11145cc2-cdc1-4851-96d2-38b233d764cf`
> Framework: Next.js 14 (App Router)
> Build adapter: `@netlify/plugin-nextjs`

This is the exact sequence to deploy the admin panel. Every step is mandatory the first time; subsequent deploys collapse to a single command.

---

## 0. One-time setup (already done — skim only)

The Netlify site is linked to this directory (`.netlify/state.json` has the siteId). The Netlify CLI must be installed globally:

```bash
npm install -g netlify-cli
netlify status   # confirms you're authenticated against the right site
```

If `netlify status` shows the wrong site or no link, re-link:

```bash
netlify link --id 11145cc2-cdc1-4851-96d2-38b233d764cf
```

---

## 1. Pre-flight (every deploy)

### 1a. Pending Supabase migrations

Run these in the Supabase SQL Editor **before** the first production deploy — the admin panel's API routes hard-fail without these tables:

1. `migrations/20260308_admin_support_tables.sql`
2. `migrations/20260308_api_cost_tracking.sql`
3. `migrations/20260517_admin_audit_and_roles.sql` ← creates `admin_users`, `admin_audit_log`, bootstraps you as `super_admin`

The third migration is **critical**: without it, the audit log writes (`logAudit()`) silently no-op and you lose the forensic trail on every cancellation, UGC moderation, billing change, and support reply.

Sign in to the admin panel once (any method — magic link or password reset) **before** running migration #3 so the bootstrap row in `admin_users` lands against your real `auth.users` row.

### 1b. Environment variables on Netlify

Set these in **Site settings → Environment variables** (or via CLI). All are required:

| Variable | Scope | Value |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | `https://cxcfymhoncysyloutvkh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Anon key from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | All | ⚠ **Server-side only** — never expose in client bundle |
| `ADMIN_EMAILS` | All | `valdez@noviogroup.com,…` (comma-separated, no spaces) |
| `NEXT_PUBLIC_ADMIN_EMAILS` | All | Same as above (legacy client gate, kept for UX) |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | All | `https://bahabuddy.sanity.studio` |
| `NEXT_PUBLIC_SUPABASE_DASHBOARD_URL` | All | Optional — link from Edge Function Health page |

CLI shortcut (run from this directory):

```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://cxcfymhoncysyloutvkh.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "<anon-key>"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "<service-role-key>"
netlify env:set ADMIN_EMAILS "valdez@noviogroup.com"
netlify env:set NEXT_PUBLIC_ADMIN_EMAILS "valdez@noviogroup.com"
netlify env:set NEXT_PUBLIC_SANITY_STUDIO_URL "https://bahabuddy.sanity.studio"
```

> ⚠️ The Service Role Key from V1 was flagged for rotation. If you haven't rotated it yet, do that in the Supabase dashboard **before** setting it here. The old key may have leaked.

### 1c. Local build smoke test

Always confirm the build works locally before pushing to Netlify — much faster feedback than waiting for a remote build to fail:

```bash
npm install
npm run build
```

The build must complete without TypeScript errors. If it fails, fix locally and re-test. Don't trigger a Netlify build with a broken local build.

---

## 2. Deploy

### Production deploy (the actual command)

```bash
netlify deploy --build --prod
```

Breakdown:
- `--build` — runs `npm run build` on Netlify's infrastructure (preferred over local build to match the production environment exactly)
- `--prod` — promotes the build to the production URL (without this flag, you'd get a draft URL only)

The first deploy takes ~3–5 minutes. Subsequent deploys with hot caches run in ~90 seconds.

### Preview deploy (no production promotion)

To validate a build without promoting it to production:

```bash
netlify deploy --build
```

This returns a unique draft URL (looks like `https://<random>--baha-buddy-admin.netlify.app`). Open it, kick the tires, then re-run with `--prod` if it looks good.

### Trigger deploy from Git (alternative)

The Netlify site is configured to auto-deploy on push to `main`. If you'd rather use that flow:

```bash
git add -A
git commit -m "Phase 2: booking ops UI + netlify hardening"
git push origin main
```

Netlify watches the repo and kicks off the build automatically.

---

## 3. Post-deploy verification

After the deploy completes, hit these surfaces in order to confirm the deploy is healthy:

1. **`/`** — Sign in. If the AuthGate refuses you, verify `NEXT_PUBLIC_ADMIN_EMAILS` contains your email.
2. **Audit Log tab** — Should load without 500s. If empty, the migration hasn't run yet (see 1a).
3. **Users tab → click a user → "Open full page →"** — Confirms `/users/[id]` page renders and `/api/user-detail` returns data.
4. **Trips tab → click a trip** — Confirms `/trips/[id]` page renders and `/api/trip-detail` returns data.
5. **Trip Detail → Admin tab → "Cancel trip"** — Open the modal but **don't submit** unless you're on a real test trip. Confirms the per-row buttons render and the modal mounts.
6. **Notifications bell (top right)** — Should pop a recent-audit feed from `/api/audit-log/recent`. Empty is fine if you haven't done any admin actions yet; a network error means the endpoint is broken.

If any of these fail, the deploy is broken — roll back (see §5) before further investigation.

---

## 4. Common issues

### "withAdminAuth missing service role key"

The `SUPABASE_SERVICE_ROLE_KEY` env var isn't set on the Netlify site. The middleware logs this server-side; clients see a 500. Fix: set the env var, redeploy.

### "Cannot find module '@/components/cancel-bookings-modal'"

The `tsconfig.json` path alias didn't resolve. This usually means Netlify's build cache is stale. Fix:

```bash
netlify build --clear-cache
```

Or in the dashboard: Deploys → Trigger deploy → Clear cache and deploy site.

### Audit log is empty after admin actions

The `admin_audit_log` table doesn't exist or RLS is misconfigured. Re-run migration `20260517_admin_audit_and_roles.sql`. Check Supabase logs for the actual failure.

### "RLS policy violation" on admin_users insert

You're hitting the audit log's `tg_deny_mutation` trigger — by design. The audit log is append-only via the helper; nothing else can insert. If you genuinely need to repair audit data, run a one-shot SQL with `BEGIN; ALTER TABLE admin_audit_log DISABLE TRIGGER tg_deny_mutation; ... COMMIT;` and document the change in `migrations/`.

---

## 5. Rollback

Netlify keeps every previous deploy. To roll back instantly:

```bash
netlify rollback
```

Or in the dashboard: Deploys → find the last known-good deploy → "Publish deploy". Takes ~30 seconds to propagate.

---

## 6. Custom domain (when ready)

The admin panel currently lives at the Netlify subdomain. To move it to e.g. `admin.bahabuddy.com`:

1. Netlify dashboard → Domain management → Add custom domain
2. Add the CNAME at your DNS provider (Cloudflare, etc.)
3. Wait for DNS propagation + SSL provisioning (5–30 min)
4. Update `ADMIN_EMAILS` and any OAuth redirect URLs in Supabase to the new domain

The `Strict-Transport-Security` header in `netlify.toml` will start applying immediately — once an admin's browser sees that header on the new domain, it'll refuse plain HTTP for two years. **Don't add HSTS to a domain you're still testing** — if you misconfigure SSL, you'll lock yourself out for the duration of the max-age. The current setup is fine because we've shipped this on a known-working Netlify domain first.

---

## 7. What's NOT in this deploy

A few things are still pending. None of them block the admin panel from being useful, but you should know about them:

- **Real supplier API integration for cancellations.** `/api/booking-cancel` calls a stub that returns mock success references (`STUB_DUFFEL_...`, `STUB_LITEAPI_...`, `STUB_VIATOR_...`). Real Duffel/LiteAPI/Viator wiring ships in Phase 5 alongside Edge Function health monitoring. Until then, cancellations succeed in the DB + audit log but don't actually cancel with the supplier. **Don't process real customer cancellations through the admin panel yet.**
- **PII reveal flow.** Email/passport reveal with reason capture (Phase 3 #23) isn't built yet. The User Detail page shows email plainly today — fine for now since we're pre-launch, but tighten this before opening admin access beyond Valdez.
- **Mark as fraud.** The button is intentionally disabled in the Trip Detail Admin tab. Phase 3.
- **Flight Detail and Hotel Detail pages.** `/bookings/[id]` doesn't exist yet — clicking a booking row in Trip Detail just hovers (Phase 2 #18 + #19, next up).

---

## 8. TL;DR — the actual deploy command

```bash
# From the Baha-Buddy-Admin directory:
npm run build                   # local smoke test
netlify deploy --build --prod   # ship it
```

That's it. Everything above is the diligence around those two lines.
