package terucare.service;

import terucare.dsa.BinarySearchTree;
import terucare.dsa.HashTable;
import terucare.dsa.MergeSort;
import terucare.model.Expense;
import terucare.store.FileStore;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The Logic Layer (see proposal section 3.5). Owns every data structure and
 * keeps them in sync after each mutation:
 *
 *   - BinarySearchTree<Expense>  keyed "date|id"  -> transactions by date (FR 6, 7)
 *   - HashTable<String, Expense> keyed id         -> O(1) lookup by id
 *   - HashTable<String, Double>  keyed category   -> category-wise totals (FR 5)
 *   - UndoManager wrapping a Stack                -> undo last operation (FR 10)
 *   - MergeSort                                   -> ranked categories (FR 8, 9)
 *
 * All public methods are synchronized: the HTTP server answers requests on a
 * small thread pool, and the structures must never be mutated concurrently.
 */
public class ExpenseService {

    /** The 8 categories the frontend offers; anything else is rejected. */
    public static final List<String> CATEGORIES = List.of(
            "Food", "Transport", "Entertainment", "Shopping",
            "Health", "Education", "Utilities", "Other");

    /** Thrown when validation fails; carries one message per offending field. */
    public static final class ValidationException extends Exception {
        public final Map<String, String> fields;

        public ValidationException(Map<String, String> fields) {
            super(String.join("; ", fields.values()));
            this.fields = fields;
        }
    }

    private final BinarySearchTree<Expense> byDate = new BinarySearchTree<>();
    private final HashTable<String, Expense> byId = new HashTable<>();
    private final HashTable<String, Double> categoryTotals = new HashTable<>();
    private final UndoManager undoManager = new UndoManager();
    private final FileStore store;

    public ExpenseService(FileStore store) {
        this.store = store;
        for (Expense e : store.load()) index(e);
    }

    // ─── Queries ─────────────────────────────────────────────────────────

    /** All expenses, newest first (reverse in-order traversal of the BST). */
    public synchronized List<Expense> listAll() {
        return byDate.reverseInOrder();
    }

    /**
     * Functional Requirement 7 — search expenses within a date range.
     * Both bounds inclusive. The BST prunes subtrees that cannot match.
     */
    public synchronized List<Expense> searchByDateRange(String from, String to) {
        Map<String, String> errors = new LinkedHashMap<>();
        LocalDate fromDate = parseDate(from, "from", errors);
        LocalDate toDate = parseDate(to, "to", errors);
        if (!errors.isEmpty()) throw new IllegalArgumentException(String.join("; ", errors.values()));
        if (fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("'from' date must be on or before 'to' date");
        }
        // Keys are "date|id". Lower bound: the exact from-date; upper bound: the
        // to-date followed by U+FFFF so every id suffix on that day is included.
        String fromKey = from;
        String toKey = to + Character.MAX_VALUE;
        return byDate.rangeSearch(fromKey, toKey);
    }

    /**
     * Functional Requirement 5 + 8 — category-wise totals, ranked from highest
     * to lowest spending using the hand-written Merge Sort.
     */
    public synchronized List<Map.Entry<String, Double>> rankedCategories() {
        List<Map.Entry<String, Double>> entries = new ArrayList<>();
        for (String category : categoryTotals.keys()) {
            entries.add(Map.entry(category, round2(categoryTotals.get(category))));
        }
        // sort DESCENDING by total
        return MergeSort.sort(entries, Comparator.comparingDouble(Map.Entry<String, Double>::getValue).reversed());
    }

    /** Overall summary (total, count, average, top category) for the dashboard. */
    public synchronized Map<String, Object> summary() {
        double total = 0;
        for (Expense e : byDate.inOrder()) total += e.getAmount();
        int count = byDate.size();
        List<Map.Entry<String, Double>> ranked = rankedCategories();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", round2(total));
        out.put("count", count);
        out.put("average", count == 0 ? 0 : round2(total / count));
        out.put("topCategory", ranked.isEmpty() ? null : ranked.get(0).getKey());
        out.put("topAmount", ranked.isEmpty() ? 0 : ranked.get(0).getValue());
        Map<String, Object> totals = new LinkedHashMap<>();
        for (Map.Entry<String, Double> entry : ranked) totals.put(entry.getKey(), entry.getValue());
        out.put("categoryTotals", totals);
        out.put("canUndo", undoManager.canUndo());
        return out;
    }

    public synchronized boolean canUndo() {
        return undoManager.canUndo();
    }

    // ─── Mutations ───────────────────────────────────────────────────────

    /**
     * Validate + add an expense. Workflow (proposal section 3.5.2, step 6):
     * inserted into the BST by date, the category total is updated in the Hash
     * Table, and the operation is pushed onto the undo Stack.
     */
    public synchronized Expense add(Expense candidate) throws ValidationException {
        Map<String, String> errors = validate(candidate);
        if (!errors.isEmpty()) throw new ValidationException(errors);

        String id = uniqueId(candidate.getId());
        Expense expense = new Expense(id, candidate.getDate(), round2(candidate.getAmount()),
                candidate.getCategory(), candidate.getDescription());

        index(expense);
        undoManager.recordAdd(expense);
        store.save(listAll());
        return expense;
    }

    /** Delete by id; the deletion is pushed onto the undo stack. */
    public synchronized Expense delete(String id) {
        Expense expense = byId.get(id);
        if (expense == null) return null;
        unindex(expense);
        undoManager.recordDelete(expense);
        store.save(listAll());
        return expense;
    }

    /**
     * Functional Requirement 10 — pop the undo Stack and reverse the operation.
     * Returns the expense plus what happened ("removed" an ADD, "restored" a
     * DELETE). Returns null when the stack is empty.
     */
    public synchronized Map<String, Object> undo() {
        UndoManager.UndoRecord record = undoManager.undo();
        if (record == null) return null;

        Expense expense = record.expense();
        String action;
        if (record.type() == UndoManager.OpType.ADD) {
            unindex(expense);                 // undoing an add removes it again
            action = "removed";
        } else if (byId.containsKey(expense.getId()) || byDate.contains(expense.bstKey())) {
            // An expense with this id (or the same date+id key) was re-added
            // after the deletion — restoring would corrupt the indexes.
            return Map.of("action", "skipped", "expense", expense, "canUndo", undoManager.canUndo());
        } else {
            index(expense);                   // undoing a delete restores it
            action = "restored";
        }
        store.save(listAll());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("action", action);
        out.put("expense", expense);
        out.put("canUndo", undoManager.canUndo());
        return out;
    }

    /** Erase everything (dashboard "Clear all data" button). */
    public synchronized void clearAll() {
        byDate.clear();
        byId.clear();
        categoryTotals.clear();
        undoManager.clear();
        store.save(listAll());
    }

    // ─── Internal helpers ────────────────────────────────────────────────

    /** Insert an expense into all three indexes. */
    private void index(Expense expense) {
        byDate.insert(expense.bstKey(), expense);
        byId.put(expense.getId(), expense);
        Double current = categoryTotals.get(expense.getCategory());
        categoryTotals.put(expense.getCategory(), (current == null ? 0 : current) + expense.getAmount());
    }

    /** Remove an expense from all three indexes. */
    private void unindex(Expense expense) {
        byDate.delete(expense.bstKey());
        byId.remove(expense.getId());
        Double current = categoryTotals.get(expense.getCategory());
        if (current != null) {
            double updated = current - expense.getAmount();
            if (updated <= 0.005) categoryTotals.remove(expense.getCategory());
            else categoryTotals.put(expense.getCategory(), updated);
        }
    }

    /** Accept a client-supplied id, but guarantee uniqueness. */
    private String uniqueId(String requested) {
        if (requested != null && !requested.isBlank() && !byId.containsKey(requested)) return requested;
        String id;
        do {
            id = "e" + System.currentTimeMillis() + (int) (Math.random() * 1000);
        } while (byId.containsKey(id));
        return id;
    }

    /** Functional Requirement 3 — validate before storing. */
    private Map<String, String> validate(Expense e) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (e.getDate() == null || e.getDate().isBlank()) {
            errors.put("date", "Date is required");
        } else {
            try {
                LocalDate date = LocalDate.parse(e.getDate());
                if (date.isAfter(LocalDate.now())) errors.put("date", "Date cannot be in the future");
            } catch (DateTimeParseException ex) {
                errors.put("date", "Date must be in yyyy-MM-dd format");
            }
        }

        if (!(e.getAmount() > 0) || Double.isNaN(e.getAmount()) || Double.isInfinite(e.getAmount())) {
            errors.put("amount", "Amount must be greater than 0");
        } else if (e.getAmount() > 1_000_000) {
            errors.put("amount", "Amount is unrealistically large");
        }

        if (e.getCategory() == null || !CATEGORIES.contains(e.getCategory())) {
            errors.put("category", "Category must be one of: " + String.join(", ", CATEGORIES));
        }

        if (e.getDescription() == null || e.getDescription().isBlank()) {
            errors.put("description", "Description is required");
        } else if (e.getDescription().length() > 200) {
            errors.put("description", "Description must be 200 characters or fewer");
        }

        return errors;
    }

    private LocalDate parseDate(String value, String field, Map<String, String> errors) {
        try {
            return LocalDate.parse(value);
        } catch (Exception ex) {
            errors.put(field, "'" + field + "' must be in yyyy-MM-dd format");
            return null;
        }
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
