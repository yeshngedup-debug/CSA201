# Teru Care — Java Backend

The backend for **Teru Care: Personal Finance & Expense Tracker** (CSA201 project,
proposal reference `2026_CSA201_01`). Plain JDK — **no Maven, Gradle, or external
libraries**. Every data structure is implemented from scratch.

## Quick start

```
backend\run.bat
```

or manually:

```powershell
cd backend
$files = Get-ChildItem -Recurse src -Filter *.java | ForEach-Object { $_.FullName }
javac -encoding UTF-8 -d out $files
java -cp out terucare.Main
```

- API base: `http://localhost:8090/api`
- Storage:  `backend/data/expenses.json` (created and seeded on first run)
- Stop: Ctrl+C in the server window
- Port override: `java -cp out terucare.Main 9000` or env var `TERU_PORT`

The React frontend (`src/api.ts`) calls `http://localhost:8090/api` — start this
backend **before** using the app. CORS is enabled for the Vite dev server.

## Architecture (proposal section 3.5)

```
React frontend (src/App.tsx, src/api.ts)          Input/UI layer
        │  HTTP + JSON
        ▼
ApiServer (com.sun.net.httpserver)                Output layer
        │
        ▼
ExpenseService                                    Logic layer
  ├─ BinarySearchTree   transactions keyed "date|id"
  ├─ HashTable          id → Expense, category → total
  ├─ UndoManager/Stack  every add/delete is reversible
  ├─ MergeSort          ranks categories highest → lowest
  └─ FileStore          persists to data/expenses.json
```

## Proposal requirement → implementation map

| # | Functional requirement | Where |
|---|---|---|
| 1 | Add a new expense | `ExpenseService.add()` ← `POST /api/expenses` |
| 2 | Capture date, amount, category, description | `Expense` model |
| 3 | Validate input before storing | `ExpenseService.validate()` (400 + per-field errors) |
| 4 | Categorize expenses | 8 fixed categories, validated |
| 5 | Category-wise totals via **Hash Table** | `dsa/HashTable.java` + `categoryTotals` |
| 6 | Store transactions by date via **BST** | `dsa/BinarySearchTree.java` (key `date|id`) |
| 7 | Date-range search | `GET /api/expenses/range?from=&to=` (pruned BST range query) |
| 8 | Rank categories via **sorting algorithm** | `dsa/MergeSort.java` ← `GET /api/categories/ranked` |
| 9 | Highest spending categories | `rankedCategories()` / `summary()` |
| 10 | Undo most recent expense via **Stack** | `dsa/Stack.java` + `UndoManager` ← `POST /api/undo` |
| 11 | Overall + category-wise summaries | `GET /api/summary` |
| 12 | Accuracy after add/undo | structures kept in sync in `ExpenseService` (verified by API test suite) |

## REST API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | liveness check |
| GET | `/api/expenses` | all expenses, newest first + `canUndo` |
| POST | `/api/expenses` | add — body `{id?, date, amount, category, description}` |
| DELETE | `/api/expenses/{id}` | delete one expense |
| DELETE | `/api/expenses` | clear all data |
| GET | `/api/expenses/range?from=YYYY-MM-DD&to=YYYY-MM-DD` | BST date-range search (inclusive) |
| GET | `/api/categories/ranked` | categories sorted by total (merge sort) |
| GET | `/api/summary` | `{total, count, average, topCategory, categoryTotals, canUndo}` |
| POST | `/api/undo` | pop the undo Stack (`restored` or `removed`) |

Validation errors return **400** with `{error, fields: {amount: "...", ...}}`.

## Undo semantics (Stack)

Every `add` and `delete` pushes an `UndoRecord` onto the stack. `POST /api/undo`
pops the most recent record and reverses it:

- last op was **ADD** → the expense is removed again (`action: "removed"`)
- last op was **DELETE** → the expense is restored (`action: "restored"`)

## Data structures (all hand-written, no `java.util` collections for storage)

| File | Structure | Key ops / complexity |
|---|---|---|
| `dsa/HashTable.java` | chaining hash table, auto-resize at load factor 0.75 | put/get/remove O(1) avg |
| `dsa/BinarySearchTree.java` | BST keyed by `date|id` | insert/find/delete O(h), pruned range search O(h+m) |
| `dsa/Stack.java` | singly linked LIFO stack | push/pop/peek O(1) |
| `dsa/MergeSort.java` | stable merge sort | O(n log n) worst case, O(n) extra space |

## Testing

An end-to-end API suite was run against the live server covering: seeding,
add, validation failures, delete, undo-both-directions, duplicate ids, range
search, ranking order, summary math, clear-all, and persistence across
restart. 24/24 passing.

> JUnit unit tests for the individual structures are a natural next step
> (the proposal lists JUnit under Technology).
