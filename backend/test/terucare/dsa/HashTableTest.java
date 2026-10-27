package terucare.dsa;

import org.junit.Test;
import static org.junit.Assert.*;

/** Unit tests for the hand-written HashTable (separate chaining, resize at 0.75 load factor). */
public class HashTableTest {

    @Test
    void putAndGet() {
        HashTable<String, Integer> t = new HashTable<>();
        assertNull(t.put("a", 1));
        assertEquals(1, t.get("a"));
        assertEquals(1, t.size());
    }

    @Test
    void overwriteReturnsOldValue() {
        HashTable<String, Integer> t = new HashTable<>();
        t.put("a", 1);
        Integer old = t.put("a", 2);
        assertEquals(1, old);
        assertEquals(2, t.get("a"));
        assertEquals(1, t.size());
    }

    @Test
    void nullKeyRejected() {
        HashTable<String, Integer> t = new HashTable<>();
        try { t.put(null, 1); fail("expected IllegalArgumentException"); }
        catch (IllegalArgumentException expected) { /* ok */ }
        try { t.get(null); fail("expected IllegalArgumentException"); }
        catch (IllegalArgumentException expected) { /* ok */ }
    }

    @Test
    void removeReturnsValueAndDecrementsSize() {
        HashTable<String, Integer> t = new HashTable<>();
        t.put("a", 1);
        t.put("b", 2);
        assertEquals(1, t.remove("a"));
        assertNull(t.get("a"));
        assertEquals(1, t.size());
    }

    @Test
    void removeMissingReturnsNull() {
        HashTable<String, Integer> t = new HashTable<>();
        assertNull(t.remove("missing"));
    }

    @Test
    void resizePastLoadFactor() {
        HashTable<Integer, String> t = new HashTable<>();
        // DEFAULT_CAPACITY = 16, MAX_LOAD_FACTOR = 0.75 -> resize at 13 elements
        for (int i = 0; i < 20; i++) {
            t.put(i, "v" + i);
        }
        assertEquals(20, t.size());
        for (int i = 0; i < 20; i++) {
            assertEquals("v" + i, t.get(i));
        }
    }

    @Test
    void clearRemovesAll() {
        HashTable<String, Integer> t = new HashTable<>();
        t.put("a", 1);
        t.put("b", 2);
        t.clear();
        assertTrue(t.isEmpty());
        assertEquals(0, t.size());
        assertNull(t.get("a"));
    }

    @Test
    void keysAndValuesContainAllEntries() {
        HashTable<String, Integer> t = new HashTable<>();
        t.put("a", 1);
        t.put("b", 2);
        t.put("c", 3);
        assertEquals(3, t.keys().size());
        assertEquals(3, t.values().size());
        assertTrue(t.keys().containsAll(java.util.List.of("a", "b", "c")));
        assertTrue(t.values().containsAll(java.util.List.of(1, 2, 3)));
    }

    @Test
    void containsKey() {
        HashTable<String, Integer> t = new HashTable<>();
        assertFalse(t.containsKey("x"));
        t.put("x", 99);
        assertTrue(t.containsKey("x"));
    }
}
