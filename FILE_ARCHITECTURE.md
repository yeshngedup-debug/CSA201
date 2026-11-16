# Teru Care — File Architecture (Simple)

A quick look at the project's file structure and how the key files relate.

```mermaid
flowchart TD
    subgraph Frontend [React Frontend]
        direction TB
        src/main.tsx -->|renders| src/App.tsx
        src/App.tsx -->|uses| src/api.ts
        src/App.tsx -->|imports charts| Recharts[recharts]
        src/App.tsx -->|imports styles| Tailwind[src/index.css (Tailwind v4)]
        src/api.ts -->|calls| backend[Java API: backend/src/main/java/terucare/**]
    end

    subgraph Backend [Java Backend]
        direction TB
        Main.java -->|compiles to| out/[class files]
        out -->|runs as| ApiServer.java
        ApiServer.java -->|uses data structures| dsa[BinarySearchTree.java, HashTable.java, Stack.java, MergeSort.java]
        ApiServer.java -->|persists to| store[FileStore.java]
        dsa -->|models| model[Expense.java]
        store -->|reads/writes| data[backend/data/expenses.json]
    end

    style Frontend fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Backend fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

## Key Files at a Glance

| Layer | Key Files |
|---|---|
| **Frontend** | `src/main.tsx` (entry) → `src/App.tsx` (main component) → `src/api.ts` (HTTP client) → `src/index.css` (Tailwind) → `src/demoData.ts` (sample data fallback) |
| **Backend (source)** | `backend/src/main/java/terucare/Main.java` (entry point) → `ApiServer.java` (HTTP server + routing) → `service/ExpenseService.java` (core logic) → `store/FileStore.java` (JSON persistence) → `dsa/` (BST, HashTable, Stack, MergeSort) → `model/Expense.java` (data model) |
| **Build & Data** | `backend/data/expenses.json` (persisted storage, seeded with 12 demos) → `out/` (compiled class files) |

## Data Flow (one sentence)

React frontend → HTTP JSON → Java API → (BST + HashTable + Stack + MergeSort) → writes `expenses.json` → UI updates in real time.

---
*Simple file architecture — Nov 2026*