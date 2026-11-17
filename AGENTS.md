# Teru Care - Expense Tracker

A React + Vite + Tailwind CSS expense tracking dashboard application backed by a **Java REST API** (Teru Care, CSA201 project).

## Quick start (everything at once)

```
start.bat
```

Compiles the backend, starts the API and the Vite dev server in their own
windows, waits until both actually answer, then opens the app. It reuses
services that are already running instead of starting duplicates, and it
installs `node_modules` on first run.

- `start.bat /nobrowser` — start without opening a browser
- `start.bat /nopause` — don't wait for a keypress (for scripts/CI)
- `stop.bat` — shut both services down (`stop.bat` kills by window title, then
  by port, and only kills a process on the API port if it identifies itself as
  "Teru Care")

Batch gotcha worth remembering if you edit these files: `shift` moves `%0` as
well as `%1`-`%9`, so any path derived from `%~dp0` after an argument-parsing
loop silently becomes the drive root (`C:\`) and every relative path fails.
`start.bat` captures `%~dp0` into `ROOT` before parsing and uses absolute paths
everywhere for that reason.

## Java Backend (required)

The app's data lives in the Java backend — start it first:

```
backend\run.bat
```

- API: `http://localhost:8090/api` (health check: `/api/health`)
- The Vite dev server and preview proxy `/api` to the backend (`vite.config.ts`), so the app calls same-origin `/api`; the backend must still be running on 8090. `VITE_API_URL` still overrides the base for production.
- Persists to `backend/data/expenses.json`
- Hand-implemented DSA: HashTable, BinarySearchTree, Stack, MergeSort (see `backend/README.md`)
- Frontend calls it from `src/api.ts`; CORS is already enabled

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - App shell: state, API wiring, keyboard shortcuts, view switching
- `src/types.ts` - Shared TypeScript types (`Expense`, `Toast`)
- `src/lib.ts` - Constants, formatters, `categoryMarkStyle`, `today`, `uid`
- `src/api.ts` - HTTP client for the Java backend (all add/delete/undo/clear calls)
- `src/components/` - Reusable UI: `Sidebar`, `AddExpenseModal`, `Toast`, `Footer`, `StatCard`, `InsightCard`, `Charts`
- `src/views/` - Full-page views: `DashboardView`, `TransactionsView`
- `backend/` - Java REST API (DSA: Hash Table, BST, Stack, Merge Sort) — see `backend/README.md`
- `backend/src/main/java/terucare/gui/` - desktop GUI prototype (WIP)
- `docs/` - Project documents (CSA201 brief, superpowers plans/specs)
- `floorplan/` - Interactive architecture map of the codebase (`floorplan/index.html`)
- `src/index.css` - Global CSS entrypoint with Tailwind CSS v4 and custom theme tokens
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and build, dev, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4 plugins and `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 7, and `@vitejs/plugin-react`
- Charts: Recharts
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`.

## Features

- **Dashboard**: Overview of total spending, monthly totals, category breakdown, and spending trends
- **Transactions**: Searchable and filterable transaction list with category filters
- **Add Expense**: Modal form for recording new expenses
- **Charts**: Area chart for spending trends, donut chart for category distribution
- **Undo**: Revert the last added expense

## Commands

- `start.bat` — Start the whole stack (backend + dev server + browser)
- `stop.bat` — Stop the whole stack
- `backend\run.bat` — Start only the Java backend on port 8090
- `dev` — Start Vite dev server
- `build` — Build for production
- `preview` — Preview production build
- `format` — Format with oxfmt

Typecheck with the project's own binary, not `npx` (`npx` resolves whatever
TypeScript version is newest in the npx cache):

```
.\node_modules\.bin\tsc.cmd --noEmit
```

## Deployment

Vercel hosts **only** the static Vite build; the Java API has to run somewhere
else (Railway, Render, Fly.io, any VPS with a JDK).

- Set `VITE_API_URL` (with the `/api` suffix) in the Vercel project env vars,
  then **redeploy** — Vite inlines it at build time.
- Without it the bundle falls back to `http://localhost:8090/api`, so the
  deployed site shows an empty "Can't reach the backend" state instead of any
  data.
- CORS is an explicit allowlist in `server/ApiServer.java`; extend it with
  `TERU_ALLOWED_ORIGINS` for custom domains.