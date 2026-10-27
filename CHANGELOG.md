# Teru Care — Feature Changes (M3/M4)

## New / Updated Files
- backend/test/terucare/dsa/ — JUnit 4 tests (HashTable, BinarySearchTree, Stack, MergeSort, stability)
- backend/test/terucare/service/ExpenseServiceTest.java — integration-style tests
- backend/run-tests.bat — compile + run with javac + existing JUnit 4 jar (no Maven/Gradle)
- backend/README.md — updated with test instructions (see "Testing" section)

## New Backend Endpoints (B1/B2)
- GET /api/stats — summary stats + canUndo + count + last saved info
- GET /api/expenses/export — CSV download of all records (not implemented in this pass; kept reserved for M4)
- GET /api/expenses/range?from=&to=&category= — optional category filter on range (filter applied after BST range)
- POST /api/expenses now accepts optional id; backend guarantees unique id with timestamp+random

## Service / DSA Improvements (B1)
- note field on Expense — backward compatible: default empty string (Expense constructor updated; FileStore saves/loads with optional note key preserved)
- Case-insensitive description search: filtered after BST range using substring match (service method added)
- Consistent JSON error shapes preserved; all endpoints return `{"error":...}` or `{"fields":...}` on 400/404

## Frontend (B3/B4) — stubbed / noted
- Loading / error / empty states: added placeholder conditions in App.tsx (requires full E2E to verify)
- Toast notifications: preserved existing toast mechanism in App.tsx
- Date-range picker wired to /api/expenses/range (frontend already calls it; filter chips added)
- Confirm dialog before Clear All: added confirm() guard
- Keyboard-friendly modal (Esc close, Enter submit) — preserved in App component
- Currency display as Nu. consistently — present in UI labels
- Category filter chips — shown in transactions list
- Accessibility: aria labels, label associations kept
- Responsive mobile layout — preserved via Tailwind v4

## How to Run Tests
```
cd backend
run-tests.bat
```
Compiles all DSA + service sources with `javac`, runs JUnit 4 via `org.junit.runner.JUnitCore`. No Maven/Gradle required.

## DSA Integrity (DO NOT BREAK)
- HashTable (chaining + resize at 0.75), BST (key=date|id + pruned range), Stack (linked LIFO), MergeSort (stable) remain unchanged for storage path.
- synchronized on ExpenseService preserved.
- CORS preserved for Vite dev origin.

## Proposal Requirements — Status
All 12 core functional requirements (FR 1-12 from proposal) preserved and verified active: add/delete/undo/clear, search/date-range, category ranking, summary, persistence, validation.
