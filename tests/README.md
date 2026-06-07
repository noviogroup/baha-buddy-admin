# Baha Buddy Admin — Testing Guide

The admin panel is the most security-sensitive surface in the Baha
Buddy ecosystem: it bypasses RLS via the service role key. The test
suite focuses on exactly that risk.

---

## Stack

- **Vitest** — test runner (Jest-compatible API, native ESM/TS, fast)
- **React Testing Library** + **`@testing-library/jest-dom`** — component tests
- **`@testing-library/user-event`** — realistic interactions (typing, clicks)
- **jsdom** — DOM environment

No Playwright/Cypress yet. End-to-end is the natural next step once
the panel has multiple workflows worth gating in CI.

---

## Layout

```
tests/
├── README.md                              ← this file
├── unit/
│   └── admin-allowlist.test.ts            ← parseAllowlist + isEmailOnAllowlist
├── api/
│   └── ugc.test.ts                        ← /api/ugc GET + POST handlers (Supabase mocked)
└── components/
    └── auth-gate.test.tsx                 ← <AuthGate /> all 4 UI states
```

The directory split reflects what's being tested:
- `unit/` — pure functions, no React, no I/O.
- `api/` — App Router route handlers, called as plain async functions
  with `Request` instances. Supabase is mocked at the module level.
- `components/` — React Testing Library renders with mocked context.

---

## What each suite locks down

| Suite | Pins these contracts |
|---|---|
| **admin-allowlist** | Allowlist parsing (commas, whitespace, casing); the dev-mode "empty allowlist = allow any authenticated user" policy; rejection of substring/homograph attacks like `valdez@noviogroup.com.evil.com` |
| **ugc API** | Input validation (`id` + `action` required; action must be `approved` or `rejected`); the friendly `42P01` (table-missing) fallback that returns `{items: [], note: ...}` instead of 500; the `updated_at` is a valid ISO string on update; arbitrary action strings cannot reach `moderation_status` |
| **auth-gate** | The 4 mutually-exclusive UI states (loading, signed-out, signed-in-not-admin, signed-in-admin); sign-out button wiring on the access-denied screen |

---

## Running

```bash
# Full suite
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report (HTML + lcov + console summary)
npm run test:coverage
open coverage/index.html

# Vitest UI in the browser (great for debugging)
npm run test:ui
```

---

## CI

`.github/workflows/ci.yml` runs `npm ci` → `npm run lint` →
`npm test` → `npm run build` on every push and PR to `main` /
`develop`. Build fails if any step fails.

---

## Extending the suite

### Add an API route test
Pattern in `tests/api/ugc.test.ts`:

1. Use `vi.mock('@/lib/supabase', () => ({ createAdminClient: ... }))`
   at the **top of the file** (before importing the route handler).
2. Set up a chain of `vi.fn()` mocks that mirror Supabase's
   fluent API (`from().select().eq().order().limit()`).
3. Re-wire them inside `beforeEach` so each test starts clean.
4. Import the route handler after the mock is in place: `import { GET, POST } from '@/app/api/<name>/route'`.
5. Build a `new Request(url, { method, body: JSON.stringify(...) })`
   and `await GET(req)` / `await POST(req)`.

### Add a component test
Pattern in `tests/components/auth-gate.test.tsx`:

1. Mock any hook that pulls Supabase or `useRouter`:
   ```ts
   const useAuthMock = vi.fn();
   vi.mock('@/components/auth-provider', () => ({
     useAuth: () => useAuthMock(),
   }));
   ```
2. Render with RTL: `render(<Component />)`.
3. Query by accessible name where possible (`getByRole`, `getByLabelText`)
   rather than test IDs. `data-testid` is a last resort.
4. For interactions use `userEvent.setup()` and `await user.click(...)` —
   it fires the full event chain (focus, keydown, etc.) the way a real
   user would.

### Why we don't test `auth-provider.tsx` directly
`AuthProvider` is mostly wiring around the real Supabase client. Its
side effects (`supabase.auth.getSession()`, `onAuthStateChange`)
require a fully mocked auth client to exercise meaningfully — at which
point the test is testing the mock, not the code. The allowlist logic
that AuthProvider depends on is fully covered in
`admin-allowlist.test.ts`, which is where the real risk lives.

---

## What's deliberately NOT tested here

- **Server components** (`page.tsx`, `layout.tsx`) — these are
  thin compositions of Supabase queries + JSX. Covered properly by
  E2E (Playwright) when we add it.
- **Visual regressions** — no Chromatic/Percy yet. Add when the
  design system stabilizes.
- **Real Supabase round-trips** — the test DB story is out of scope
  for unit tests. Integration tests against a local Supabase instance
  would go in a separate `tests/integration/` directory with a
  `supabase start` setup step in CI.

---

## When you should write a new test

Before fixing a bug, write a failing test that reproduces it. That's
when test coverage compounds — every regression is a new permanent
gate. The current suite is the floor, not the ceiling.
