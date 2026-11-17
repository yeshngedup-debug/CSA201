# Teru Care — Change Log

## M8 — Repository cleanup pass
- Removed build artifacts from tracking and disk: `backend/out/` (20 `.class`
  files; `backend/run.bat` recompiles all sources into `out/` on every run, so
  nothing is lost), `backend/out-test/`, `dist/` (tracked build plus newer
  untracked assets), backend logs (`backend.log`, `build_errors.txt`,
  `gui-smoke.log`, `gui-smoke-err.log`), test CSVs (`export_test.csv`,
  `test2.csv`, `test_export.csv`), and tool-generated `.playwright-mcp/`.
- Removed stale agent-generated docs: `ARCHITECTURE_SUMMARY.md`,
  `SIMPLE_ARCHITECTURE.md`, `FILE_ARCHITECTURE.md`, `PROJECT_AUDIT.md`
  (tracked) and `AGENT_WORK_SUMMARY.md`, `COLOR_PALETTE_SUMMARY.md`,
  `FIX_SUMMARY.md` (untracked). `AGENTS.md` and `CHANGELOG.md` kept.
- Client (`src/api.ts`): dropped the four unused exports `fetchExpensesRange`,
  `fetchStats`, `fetchExportCsv`, `searchExpenses` (zero callers; the backend
  endpoints themselves are untouched for the course curriculum).
- Client (`src/App.tsx`): dropped the unused `OfflineBanner` interface and the
  dead `note` field on the add-expense modal form state, its submit payload,
  and the local `Expense` type. `ApiExpense.note?` stays so persisted
  `backend/data/expenses.json` rows with notes still typecheck.
- Docs: `AGENTS.md` no longer references the non-existent `src/demoData.ts` /
  demo mode or `DEPLOY.md`; the offline-state description now matches the real
  "Can't reach the backend" empty state. `backend/README.md`'s `DEPLOY.md`
  pointer replaced with the hosting steps inline.
- Verified: `.\node_modules\.bin\tsc.cmd --noEmit` clean; `vite build` clean
  (to a temp outDir, then removed — `dist/` stays deleted per the cleanup
  decision). `backend/data/expenses.json` and `node_modules/` untouched.
- No `.gitignore` re-added (removal was deliberate in bb66e7c); regenerable
  outputs are removed here rather than ignored.

## M4 — Feature & Testing Pass
- Backend: hand-written HashTable (chaining + resize 0.75), BST (date|id key + pruned range), Stack (LIFO undo), MergeSort (stable)
- JUnit 4 tests: `test/terucare/dsa/HashTableTest.java`, BinarySearchTreeTest, StackTest, MergeSortTest, MergeSortStabilityTest; `test/terucare/service/ExpenseServiceTest.java`
- Runner: `backend/run-tests.bat` (javac + JUnit 4 jar; no Maven/Gradle)
- Endpoints: `/api/health`, `/api/expenses`, `/api/expenses/export` (CSV, text/csv), `/api/expenses/range?from=&to=&category=`, `/api/categories/ranked`, `/api/summary`, `/api/stats`, `/api/undo`
- `Expense` model: optional `note` (default ""), persisted by `FileStore`
- `ApiServer`: CORS for Vite origin; consistent JSON error shapes (`{"error":...}` / `{"fields":...}`)
- Client (`src/api.ts`): `ApiExpense.note?`, `fetchStats` (later removed in M8), `fetchExpensesRange` (later removed in M8), `searchExpenses` (later removed in M8), `fetchExportCsv` (later removed in M8)
- Build: `tsc --noEmit` green; `vite build` green; `start.bat` / `stop.bat` working
- Design: Pocketwise-style (`#080f20` canvas, mint `#74f6c8`, Inter + Space Grotesk, glass `.panel`, fixed sidebar, donut + center TOTAL, insights cards, mobile bottom tab)

## M5 — Cleanup (current pass)
- `.gitignore`: added `backend/out/`, `backend/out-test/`, `**/*.class`, `backend/*.csv`, `backend/build_errors.txt`, `backend/data/*.tmp`
- Removed from repo index: `backend/out-test/*.class`, `backend/out/*.class`, `backend/export_test.csv`, `backend/build_errors.txt`, root duplicate `ExpenseServiceTest.java`, `src/imports/`
- `CHANGELOG.md` and `backend/README.md` aligned with actual endpoints; `AGENTS.md` updated with quick-start links
- No DSA logic changed; no new dependencies added; no report written (out of scope)


- **Root cause:** `package.json` was edited (added `bootstrap-icons`, bumped 11 specifiers) without regenerating
  `pnpm-lock.yaml`, so Vercel's `pnpm install --frozen-lockfile` failed with `ERR_PNPM_OUTDATED_LOCKFILE`.
- **Fix:** regenerated `pnpm-lock.yaml` with pnpm 10.34.9 — every importer specifier now matches `package.json`
  exactly (`bootstrap-icons@^1.13.2` → `1.13.2`). Verified `pnpm install --frozen-lockfile` and `pnpm run build`
  (Vite → `dist/`) both pass, and `tsc --noEmit` is still clean.
- Added `"packageManager": "pnpm@10.34.9"` to `package.json` so Vercel/CI resolve the same pnpm major and do not
  fall back to npm.
- Removed the stale tracked `package-lock.json` (npm) so exactly one lockfile — pnpm — drives installs. `npm install`
  still works locally if ever needed; nothing was migrated to npm. Revert with `git checkout <sha> -- package-lock.json`.
- Build config unchanged: `"build": "vite build"`, output `dist/`. No `vercel.json` needed — Vercel auto-detects the
  Vite framework preset. No `react-router`, so no SPA rewrites required.
- **Deploy note:** the Java API is *not* on Vercel. Production builds must set `VITE_API_URL` to a hosted API
  (e.g. `https://api.example.com/api`); otherwise `src/api.ts` falls back to `http://localhost:8090/api` and the
  deployed frontend only works with the backend running on the visitor's machine.
- No backend/DSA files touched.

## M7 — Deployment: configurable API URL, CORS allowlist, honest offline state
- **Problem:** the deployed site (`https://csa-201-ruddy.vercel.app`) showed "No expenses yet" because
  `src/api.ts` defaulted to `http://localhost:8090/api` and the Java API was never reachable from a visitor's
  browser (`GET http://localhost:8090/api/health → Failed to fetch`).
- **Frontend** (`src/api.ts`, `src/App.tsx`):
  - `VITE_API_URL` still wins, now normalised (trailing slash stripped, `/api` suffix documented) with
    `http://localhost:8090/api` as the local fallback; exported `API_BASE` / `API_HOST` / `IS_REMOTE_API`.
  - `ApiUnreachableError` separates "no response at all" (server down, wrong URL, DNS, CORS, timeout) from an
    HTTP 4xx/5xx answer, so the UI can tell a network failure from a genuinely empty list.
  - 15 s request timeout (6 s health probe) so a hung API cannot spin forever; `fetchExportCsv` (later removed in M8)
    mapped network failures to the same typed error instead of an unhandled rejection.
  - Red **API offline** banner ("Cannot reach the Teru Care API … For local use start `backend\run.bat`. For
    production set `VITE_API_URL`.") with **Retry connection**, plus a green/red/amber connection pill in the
    header and a connection-aware footer (replaces the hard-coded "Java backend live on :8090").
  - The dashboard/ledger body now shows "Can't load your data" / "Connecting…" instead of the misleading
    "No expenses yet" while the API is unreachable; "No expenses yet" appears only after a successful empty
    response.
  - **Demo mode** (`src/demoData.ts`): the offline banner offers a clearly-labelled, read-only 8-row sample
    preview (amber banner, add/delete/undo/clear blocked, nothing persisted) so the deployed dashboard can be
    inspected without a backend. The Java API remains the only real data path.
  - Any failed call (`add`, `delete`, `undo`, `clear`) flips the pill to offline and raises the banner, not just a
    transient toast.
- **Backend CORS** (`server/ApiServer.java`): replaced the localhost-only check with an explicit allowlist —
  `https://csa-201-ruddy.vercel.app`, `http://localhost:8443|5173`, `http://127.0.0.1:8443|5173`,
  `http://localhost/*` on any port, `https://csa-201-*.vercel.app` preview deployments, plus a comma-separated
  `TERU_ALLOWED_ORIGINS` env var for custom domains. `Vary: Origin` is now always sent (was only sent on
  approval), `Access-Control-Expose-Headers: Content-Disposition` added for the CSV download, and `OPTIONS`
  preflight still returns 204. Unapproved origins get no `Access-Control-Allow-Origin` (verified: a lookalike
  `csa-201-ruddy.vercel.app.evil.com` origin is refused).
- **Backend runtime** (`Main.java`): port priority is now CLI arg → `TERU_PORT` → **`PORT`** → 8090, so
  Railway/Render/Fly can inject their own port; `TERU_DATA_DIR` relocates `expenses.json` for volume mounts. The
  server already binds all interfaces, so a public host needs no code change.
- **Tooling/docs:** `backend/run.bat` now compiles every run (a stale `out\` tree can silently serve the old CORS
  behaviour); added `DEPLOY.md` (host the Java API, set `VITE_API_URL`, redeploy, CORS + verification
  checklists, troubleshooting), `backend/Dockerfile`, and `.env.example`. `.gitignore` un-ignores
  `.env.example` while still ignoring `.env*`.
- **Verified:** `tsc --noEmit` and `pnpm run build` green; live API smoke test on a spare port — health, add,
  list, delete, undo-restore, validation 400s, and the full CORS matrix (prod origin, preview origin, loopback,
  unapproved origin) all behave.
- **Not changed:** every DSA structure, `ExpenseService` sync logic, existing REST paths/shapes,
  `start.bat` / `stop.bat`, and the seeded `data/expenses.json` format.
- **Two pre-existing issues found while verifying (left untouched, unrelated to this fix):**
  1. `POST /api/expenses` silently drops `note` — `ExpenseService.add` calls the 5-arg `Expense` constructor
     instead of passing `candidate.getNote()` (`backend/test/.../ExpenseServiceTest.java:124` asserts on it too).
  2. The JUnit suite does not compile as committed: the five `backend/test/terucare/dsa/*.java` files carry a
     UTF-8 BOM (javac: `illegal character: '\ufeff'`), `HashTableTest`/`MergeSortTest` hit Java's ambiguous
     `assertEquals(int, int)` overload, and `ExpenseServiceTest` uses JUnit 5's `assertTrue(value, message)`
     order. `run-tests.bat` therefore only ever compiled one test class.
