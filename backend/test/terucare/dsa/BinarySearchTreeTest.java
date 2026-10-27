package terucare.dsa;

import org.junit.Test;
import static org.junit.Assert.*;

/** Unit tests for the hand-written Binary Search Tree (insert/delete/range search). */
public class BinarySearchTreeTest {

    @Test
    void insertAndFind() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        assertTrue(t.insert("b", "B"));
        assertTrue(t.insert("a", "A"));
        assertTrue(t.insert("c", "C"));
        assertEquals("A", t.find("a"));
        assertEquals("B", t.find("b"));
        assertEquals("C", t.find("c"));
        assertNull(t.find("z"));
    }

    @Test
    void duplicateKeyIgnored() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        assertTrue(t.insert("a", "A"));
        assertFalse(t.insert("a", "AA"));
        assertEquals("A", t.find("a"));
        assertEquals(1, t.size());
    }

    @Test
    void deleteLeaf() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        t.insert("a", "A");
        t.insert("b", "B");
        t.insert("c", "C");
        assertEquals("B", t.delete("b"));
        assertNull(t.find("b"));
        assertEquals("A", t.find("a"));
        assertEquals("C", t.find("c"));
    }

    @Test
    void deleteOneChild() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        t.insert("b", "B");
        t.insert("a", "A");
        assertEquals("B", t.delete("b"));
        assertNull(t.find("b"));
        assertEquals("A", t.find("a"));
    }

    @Test
    void deleteTwoChildren() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        t.insert("b", "B");
        t.insert("a", "A");
        t.insert("c", "C");
        t.insert("cc", "CC");
        assertEquals("B", t.delete("b"));
        assertNull(t.find("b"));
        // successor of b in-order is c -> b replaced by c
        assertEquals("A", t.find("a"));
        assertEquals("C", t.find("c"));
        assertEquals("CC", t.find("cc"));
    }

    @Test
    void deleteMissingReturnsNull() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        assertNull(t.delete("missing"));
    }

    @Test
    void inOrderSorted() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        String[] keys = {"f", "b", "a", "d", "c", "e", "g", "i", "h"};
        for (String k : keys) t.insert(k, k);
        assertEquals(java.util.List.of("a","b","c","d","e","f","g","h","i"), t.inOrder());
    }

    @Test
    void reverseInOrder() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        t.insert("b", "B");
        t.insert("a", "A");
        t.insert("c", "C");
        assertEquals(java.util.List.of("C","B","A"), t.reverseInOrder());
    }

    @Test
    void rangeSearchInclusiveAndPruned() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        t.insert("a", "A");
        t.insert("b", "B");
        t.insert("c", "C");
        t.insert("d", "D");
        t.insert("e", "E");
        assertEquals(java.util.List.of("B","C","D"), t.rangeSearch("b", "d"));
        // only 'a' and 'e' excluded
        assertEquals(3, t.rangeSearch("b", "d").size());
        assertEquals(5, t.rangeSearch("a", "e").size());
        assertEquals(0, t.rangeSearch("z", "zzz").size());
    }

    @Test
    void emptyTree() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        assertTrue(t.isEmpty());
        assertEquals(0, t.size());
        assertNull(t.find("anything"));
        assertTrue(t.inOrder().isEmpty());
        assertTrue(t.rangeSearch("a", "z").isEmpty());
    }

    @Test
    void clear() {
        BinarySearchTree<String> t = new BinarySearchTree<>();
        t.insert("a", "A");
        t.insert("b", "B");
        t.clear();
        assertTrue(t.isEmpty());
        assertEquals(0, t.size());
    }
}
