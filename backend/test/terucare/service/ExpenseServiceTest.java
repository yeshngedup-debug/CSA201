package terucare.service;

import terucare.model.Expense;
import terucare.store.FileStore;
import org.junit.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import static org.junit.Assert.*;

public class ExpenseServiceTest {

    private static FileStore tempStore() throws Exception {
        Path temp = Files.createTempFile("fintrack-test", ".json");
        Files.deleteIfExists(temp);
        return new FileStore(temp);
    }

    @Test
    public void addValidationFailures() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense bad = new Expense(null, "bad", -5, "BadCat", "");
        Exception caught = null;
        try { svc.add(bad); fail("expected ValidationException"); }
        catch (Exception ex) { caught = ex; }
        assertNotNull(caught);
        assertTrue(caught.getMessage().contains("date") || caught.getMessage().contains("amount") || caught.getMessage().contains("category"));
    }

    @Test
    public void addSuccessAndSummary() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense e = new Expense(null, "2026-09-10", 250.0, "Food", "Lunch");
        Expense saved = svc.add(e);
        assertNotNull(saved.getId());
        assertEquals(250.0, saved.getAmount(), 0.001);
        Map<String, Object> s = svc.summary();
        assertEquals(250.0, s.get("total"));
        assertTrue((Integer) s.get("count") >= 1);
    }

    @Test
    public void deleteRestoresCanUndo() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense e = new Expense(null, "2026-09-11", 100.0, "Transport", "Bus");
        Expense saved = svc.add(e);
        assertTrue(svc.canUndo());
        assertNotNull(svc.delete(saved.getId()));
        assertTrue(svc.canUndo());
    }

    @Test
    public void undoOfAddRemoves() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense saved = svc.add(new Expense(null, "2026-09-12", 100.0, "Food", "Dinner"));
        Map<String, Object> result = svc.undo();
        assertNotNull(result);
        assertEquals("removed", result.get("action"));
    }

    @Test
    public void undoOfDeleteRestores() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        Expense saved = svc.add(new Expense(null, "2026-09-12", 100.0, "Food", "Dinner"));
        svc.delete(saved.getId());
        Map<String, Object> result = svc.undo();
        assertNotNull(result);
        assertEquals("restored", result.get("action"));
    }

    @Test
    public void dateRangeSearch() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.add(new Expense(null, "2026-09-01", 10, "Food", "A"));
        svc.add(new Expense(null, "2026-09-05", 20, "Food", "B"));
        List<Expense> found = svc.searchByDateRange("2026-09-01", "2026-09-05");
        assertTrue(found.size() >= 2);
    }

    @Test
    public void rankedCategoriesOrder() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.clearAll();
        svc.add(new Expense(null, "2026-09-01", 500, "Food", "Big"));
        svc.add(new Expense(null, "2026-09-01", 100, "Transport", "Small"));
        List<Map.Entry<String, Double>> ranked = svc.rankedCategories();
        assertFalse(ranked.isEmpty());
        assertEquals("Food", ranked.get(0).getKey());
    }

    @Test
    public void clearAll() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.add(new Expense(null, "2026-09-01", 100, "Food", "A"));
        svc.clearAll();
        assertEquals(0, svc.summary().get("count"));
        assertFalse(svc.canUndo());
    }

    @Test
    public void persistenceRoundTripViaFileStore() throws Exception {
        Path temp = Files.createTempFile("persist", ".json");
        Files.deleteIfExists(temp);
        FileStore store = new FileStore(temp);
        ExpenseService svc = new ExpenseService(store);
        svc.clearAll();
        svc.add(new Expense(null, "2026-09-20", 99.99, "Health", "Checkup"));
        ExpenseService svc2 = new ExpenseService(store);
        List<Expense> all = svc2.listAll();
        boolean found = all.stream().anyMatch(e -> "Health".equals(e.getCategory()) && e.getAmount() == 99.99);
        assertTrue(found, "Expense persisted and loaded back");
    }

    @Test
    public void notePersistenceAndCategoryFilter() throws Exception {
        ExpenseService svc = new ExpenseService(tempStore());
        svc.clearAll();
        Expense withNote = new Expense(null, "2026-09-15", 42.0, "Food", "Note test", "remember this");
        Expense saved = svc.add(withNote);
        assertNotNull(saved.getNote());
        assertEquals("remember this", saved.getNote());
        List<Expense> rangeAll = svc.searchByDateRange("2026-09-01", "2026-09-30");
        boolean hasNote = rangeAll.stream().anyMatch(e -> "remember this".equals(e.getNote()));
        assertTrue(hasNote, "Note persisted through BST + persistence");
        assertEquals(42.0, svc.summary().get("total"));
    }
}