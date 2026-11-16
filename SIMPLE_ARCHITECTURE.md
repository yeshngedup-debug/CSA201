# Teru Care — Simple Architecture

A quick visual overview of the Teru Care expense tracker.

```mermaid
flowchart TD
    subgraph Frontend [React Frontend (port 8443)]
        App[App.tsx] -->|HTTP JSON| API[API Client (api.ts)]
        App -->|Recharts| Charts[Charts: Area + Donut]
        App -->|Tailwind| UI[UI: Sidebar, Modal, Stats, Toasts]
    end

    subgraph Backend [Java REST API (port 8090)]
        ApiServer[ApiServer.java] -->|Handles /api/*| Routes[Routing + CORS]
        Routes -->|ExpenseService| DSA[DSA: BST + HashTable + Stack + MergeSort]
        DSA -->|Persist| FileStore[FileStore.java → expenses.json]
    end

    Frontend <-->|HTTPS/JSON| Backend
```

## Components in One Line

- **React + Vite** frontend (port 8443) calls a **JDK‑only Java REST API** (port 8090) that implements custom **BST, HashTable, Stack, MergeSort** data structures and saves everything to `backend/data/expenses.json`.

## Data Flow (Add Expense)

1. User submits the **Add Expense** form
2. Frontend `POST /api/expenses` with JSON
3. Java `ExpenseService` validates, inserts into **BST** (by date), updates **HashTable** (category total), pushes an **Undo** record onto the **Stack**, and writes the expense list to `expenses.json`
4. Response returns the saved expense; frontend prepends it to the local list and enables **Undo**

---
*Simple architecture diagram — Nov 2026*