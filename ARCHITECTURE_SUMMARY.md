# Teru Care — Simple Architecture Audit

## Overview
**Teru Care** is a full-stack expense tracking dashboard (React + Vite + Tailwind) backed by a hand‑crafted Java REST API. The frontend UI talks to the Java API over HTTP/JSON; all data lives in the Java backend, which persists to `backend/data/expenses.json`.

---

## High‑Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TERU CARE APPLICATION                        │
├─────────────────────┬─────────────────────┬───────────────────────┤
│                     │                     │                       │
│   React Frontend   │   HTTPS/JSON API   │   Java Backend (JDK)  │
│   (port 8443)      │   (port 8090)      │   (no external deps)  │
│                     │                     │                       │
│  ┌─────────────────┐│                     │   ┌─────────────────┐ │
│  │ UI Layer        ││  HTTP + JSON       │   │ DSA Structures  │ │
│  │ • App.tsx       ││  • /api/* endpoints│   │ • BST (date)    │ │
│  │ • api.ts        ││                    │   │ • HashTable     │ │
│  │ • Recharts      ││                    │   │ • Stack (undo)  │ │
│  │ • Tailwind CSS  ││                    │   │ • MergeSort     │ │
│  └─────────────────┘│                    │   └─────────────────┘ │
│                     │                     │                       │
│  ┌─────────────────┐│                    │   ┌─────────────────┐ │
│  │ State & Views   ││                    │   │ File Store      │ │
│  │ • expenses[]    ││                    │   │ • expenses.json │ │
│  │ • filters, toasts││                    │   └─────────────────┘ │
│  └─────────────────┘│                    │                       │
└─────────────────────┴─────────────────────┴───────────────────────┘
                                   ▲
                                   │
                     ┌─────────────────────────┐
                     │  Data Persistence Layer │
                     │  (backend/data/expenses.json) │
                     └─────────────────────────┘
```

---

## Component Details

### 1. Frontend (React + Vite + Tailwind CSS v4)
- **Entry**: `src/main.tsx` → lazy‑loads `App` with Suspense loading state
- **Routing**: Two views — `dashboard` and `transactions`, switched via sidebar
- **Data client**: `src/api.ts` — all calls go through `http://localhost:8090/api` (or `VITE_API_URL`)
- **Charts**: Recharts — Area chart (spending trend) + Donut chart (category distribution)
- **UI components**: StatCard, InsightCard, Sidebar, AddExpenseModal, ToastContainer
- **Styling**: Tailwind CSS v4 utilities + custom tokens in `src/index.css`
- ** offline demo**: `src/demoData.ts` — read‑only sample data used when the API is unreachable

### 2. Backend (Java REST API, JDK only)
- **Entry point**: `backend/src/main/java/terucare/Main.java` — starts `ApiServer` on port 8090 (configurable via `TERU_PORT` arg or env)
- **HTTP server**: JDK `com.sun.net.httpserver.HttpServer` — zero external dependencies
- **CORS**: Approved origins are `localhost:*` and `127.0.0.1:*` (browser‑only)

#### API Endpoints (all under `/api`)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/expenses` | All expenses, newest first + `canUndo` flag |
| POST | `/expenses` | Add an expense `{date, amount, category, description}` |
| DELETE | `/expenses/{id}` | Delete one expense by id |
| DELETE | `/expenses` | Clear all data |
| GET | `/expenses/range?from=&to=` | BST date‑range search (inclusive) |
| GET | `/categories/ranked` | HashTable totals + MergeSort ranking |
| GET | `/summary` | `{total, count, average, topCategory, categoryTotals, canUndo}` |
| POST | `/undo` | Pop the undo Stack and reverse the last add/delete |

- **Validation**: 400 errors with per‑field messages (date format, amount > 0, category must be one of 8, description required ≤ 200 chars)
- **Undo semantics**: Stack of `add`/`delete` records; `POST /api/undo` restores or removes the last change

#### Data Structures (all hand‑written, no `java.util` collections for storage)

| Structure | Purpose | Key ops / complexity |
|---|---|---|
| **BinarySearchTree** | Transactions keyed by `date|id` | insert/find/delete O(log n), range search O(log n + m) |
| **HashTable** | id → Expense; category → running total | put/get/remove O(1) avg, auto‑resize at load factor 0.75 |
| **Stack** | Undo/redo history | push/pop/peek O(1) LIFO |
| **MergeSort** | Rank categories by total spending | O(n log n) worst‑case, stable |

#### Persistence
- `FileStore` reads/writes the entire expense list to `backend/data/expenses.json`
- On first run (no file), seeds 12 demo transactions so the dashboard looks populated
- Atomic write: temp file + rename, so the JSON is never left in a corrupted state
- Survives server restarts

---

## Data Flow (Add Expense Example)

1. User fills the **Add Expense** modal and clicks **Add Expense**
2. `addExpense()` in `src/api.ts` → `POST /api/expenses` with JSON body
3. `ApiServer.handle()` → routes to `ExpenseService.add()`
4. `ExpenseService.add()`:
   - Validates date, amount, category, description
   - Generates a unique id (or uses client‑provided id if unique)
   - Inserts into **BST** (key = `date|id`)
   - Updates **HashTable** (category → running total)
   - Pushes an **UndoRecord** onto the **Stack**
   - Persists the full list to `expenses.json` via `FileStore.save()`
5. Response returns the saved expense + `canUndo: true`
6. Frontend:
   - Prepends the new expense to local `expenses` state
   - Enables the **Undo** button (`canUndo = true`)
   - Shows a success toast

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **No build tools / no Maven/Gradle** | The proposal requires "Plain JDK — no Maven, Gradle, or external libraries". Everything is compiled with `javac` and run with `java -cp out terucare.Main`. |
| **Custom DSA from scratch** | Educational purpose (CSA201): students implement BST, HashTable, Stack, MergeSort to understand fundamentals; also avoids dependency bloat. |
| **File‑based persistence** | Simple, zero‑config storage; data survives restarts; easy to demo on a single machine. |
| **CORS limited to localhost** | Security: the API is not open to the internet; only the local Vite dev server (and deployed Vercel preview URLs) can call it. |
| **React lazy + Suspense** | Keeps the initial bundle small; shows a pleasant loading state while the API request resolves. |
| **Two‑view architecture (dashboard/transactions)** | Separates high‑level overview from detailed ledger; UI re‑uses the same data store, only filters/sorts differently. |

---

## Audit Checklist (Pass/Fail)

| Area | Status | Notes |
|---|---|---|
| **Frontend → API communication** | ✅ | `src/api.ts` correctly calls all endpoints; error handling shows red banner if backend is offline. |
| **CORS configuration** | ✅ | Only localhost origins approved; blocklist prevents external web sites from driving the API. |
| **Data structures implementation** | ✅ | BST, HashTable, Stack, MergeSort are all hand‑written; no `java.util.*` used for core storage. |
| **Undo/redo semantics** | ✅ | Stack‑based; `POST /api/undo` correctly restores or removes the last operation; edge case "skipped" handled. |
| **Persistence & restart survival** | ✅ | `FileStore` loads from `expenses.json` on startup; seeds demo data if missing. |
| **Input validation** | ✅ | Server‑side validation in `ExpenseService.validate()`; 400 errors with per‑field messages. |
| **Date‑range search (FR‑7)** | ✅ | BST `rangeSearch` prunes subtrees; params `from`/`to` are inclusive. |
| **Category ranking (FR‑8, FR‑9)** | ✅ | HashTable accumulates totals; `rankedCategories()` uses hand‑written MergeSort. |
| **Stateless API design** | ✅ | Each endpoint is self‑contained; server stores all state (structures + file). |
| **No security headers beyond CORS** | ⚠️ | Audit note: missing `Content‑Security‑Policy`, `X‑Content‑Type‑Options`, etc. (out of scope for this project). |
| **Deployment‑ready** | ✅ | `DEPLOY.md` describes how to host the static front‑end on Vercel and the Java API on Railway/Render/Fly. |

---

## Simple Architecture Summary (one‑sentence)

> **Teru Care** is a React Vite frontend (port 8443) that consumes a hand‑crafted Java JDK REST API (port 8090) which implements core data‑structure algorithms (BST, HashTable, Stack, MergeSort) and persists expenses to a local JSON file, providing a full‑featured expense‑tracking dashboard with add/delete/undo/charting capabilities.

---
*Generated from code audit on 2026‑11‑16.*