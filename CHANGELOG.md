# FinTrack (Teru Care) — Change Log

## M4 — Feature & Testing Pass
- Backend: hand-written HashTable (chaining + resize 0.75), BST (date|id key + pruned range), Stack (LIFO undo), MergeSort (stable)
- JUnit 4 tests: `test/terucare/dsa/HashTableTest.java`, BinarySearchTreeTest, StackTest, MergeSortTest, MergeSortStabilityTest; `test/terucare/service/ExpenseServiceTest.java`
- Runner: `backend/run-tests.bat` (javac + JUnit 4 jar; no Maven/Gradle)
- Endpoints: `/api/health`, `/api/expenses`, `/api/expenses/export` (CSV, text/csv), `/api/expenses/range?from=&to=&category=`, `/api/categories/ranked`, `/api/summary`, `/api/stats`, `/api/undo`
- `Expense` model: optional `note` (default ""), persisted by `FileStore`
- `ApiServer`: CORS for Vite origin; consistent JSON error shapes (`{"error":...}` / `{"fields":...}`)
- Client (`src/api.ts`): `ApiExpense.note?`, `fetchStats`, `fetchExpensesRange`, `searchExpenses`, `fetchExportCsv`
- Build: `tsc --noEmit` green; `vite build` green; `start.bat` / `stop.bat` working
- Design: Pocketwise-style (`#080f20` canvas, mint `#74f6c8`, Inter + Space Grotesk, glass `.panel`, fixed sidebar, donut + center TOTAL, insights cards, mobile bottom tab)

## M5 — Cleanup (current pass)
- `.gitignore`: added `backend/out/`, `backend/out-test/`, `**/*.class`, `backend/*.csv`, `backend/build_errors.txt`, `backend/data/*.tmp`
- Removed from repo index: `backend/out-test/*.class`, `backend/out/*.class`, `backend/export_test.csv`, `backend/build_errors.txt`, root duplicate `ExpenseServiceTest.java`, `src/imports/`
- `CHANGELOG.md` and `backend/README.md` aligned with actual endpoints; `AGENTS.md` updated with quick-start links
- No DSA logic changed; no new dependencies added; no report written (out of scope)

## M6 — Deploy fix (Vercel / pnpm lockfile sync)
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
