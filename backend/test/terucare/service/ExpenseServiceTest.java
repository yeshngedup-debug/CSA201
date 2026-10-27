package terucare.service;

import terucare.dsa.BinarySearchTree;
import terucare.dsa.HashTable;
import terucare.model.Expense;
import terucare.store.FileStore;
import org.junit.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import static org.junit.Assert.*;

/** Integration-style tests for ExpenseService (keeps BST + HashTable + Stack + FileStore in sync). */
public class ExpenseServiceTest {

    private static FileStore tempStore() throws Exception {
        Path temp = Files.createTempFile("fintrack-test", ".json");
        Files.deleteIfExists(temp);
        return new FileStore(temp);
    }

    @Test
    void addValidationFailures() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense bad = new Expense(null, "bad", -5, "BadCat", "");
        ExpenseService.ValidationException ex = `svc.add(bad); fail("expected exception");
        assertTrue(ex.fields.containsKey("date") || ex.fields.containsKey("amount") || ex.fields.containsKey("category") || ex.fields.containsKey("description"));
    }

    @Test
    void addSuccessAndSummary() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense e = new Expense(null, "2026-09-10", 250.0, "Food", "Lunch");
        Expense saved = svc.add(e);
        assertNotNull(saved.getId());
        assertEquals(250.0, saved.getAmount());
        Map<String, Object> summary = svc.summary();
        assertEquals(250.0, summary.get("total"));
        assertTrue((Integer) summary.get("count") >= 1);
    }

    @Test
    void deleteRestoresCanUndo() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense e = new Expense(null, "2026-09-11", 100.0, "Transport", "Bus");
        Expense saved = svc.add(e);
        assertTrue(svc.canUndo());
        Expense removed = svc.delete(saved.getId());
        assertNotNull(removed);
        assertTrue(svc.canUndo());
    }

    @Test
    void undoOfAddRemoves() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense e = new Expense(null, "2026-09-12", 100.0, "Food", "Dinner");
        Expense saved = svc.add(e);
        Map<String, Object> result = svc.undo();
        assertNotNull(result);
        assertEquals("removed", result.get("action"));
    }

    @Test
    void undoOfDeleteRestores() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense e = new Expense(null, "2026-09-12", 100.0, "Food", "Dinner");
        Expense saved = svc.add(e);
        svc.delete(saved.getId());
        Map<String, Object> result = svc.undo();
        assertNotNull(result);
        assertEquals("restored", result.get("action"));
    }

    @Test
    void dateRangeSearch() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.add(new Expense(null, "2026-09-01", 10, "Food", "A"));
        svc.add(new Expense(null, "2026-09-05", 20, "Food", "B"));
        List<Expense> found = svc.searchByDateRange("2026-09-01", "2026-09-05");
        assertTrue(found.size() >= 2);
    }

    @Test
    void rankedCategoriesOrder() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.clearAll(); // start fresh
        svc.add(new Expense(null, "2026-09-01", 500, "Food", "Big"));
        svc.add(new Expense(null, "2026-09-01", 100, "Transport", "Small"));
        List<Map.Entry<String, Double>> ranked = svc.rankedCategories();
        assertFalse(ranked.isEmpty());
        assertEquals("Food", ranked.get(0).getKey());
        assertTrue(ranked.get(0).getValue() >= ranked.get(1).getValue());
    }

    @Test
    void clearAll() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.add(new Expense(null, "2026-09-01", 100, "Food", "A"));
        assertTrue(svc.canUndo() || svc.summary().get("count") instanceof Integer);
        svc.clearAll();
        assertEquals(0, svc.summary().get("count"));
        assertFalse(svc.canUndo());
    }

    @Test
    void persistenceRoundTripViaFileStore() throws Exception {
        Path temp = Files.createTempFile("persist", ".json");
        Files.deleteIfExists(temp);
        FileStore store = new FileStore(temp);
        ExpenseService svc = new ExpenseService(store);
        svc.clearAll();
        svc.add(new Expense(null, "2026-09-20", 99.99, "Health", "Checkup"));
        // Reload via new service
        ExpenseService svc2 = new ExpenseService(store);
        List<Expense> all = svc2.listAll();
        boolean found = all.stream().anyMatch(e -> e.getCategory().equals("Health") && e.getAmount() == 99.99);
        assertTrue(found, "Expense persisted and loaded back");
    }
}
