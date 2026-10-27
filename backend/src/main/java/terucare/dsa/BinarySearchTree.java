package terucare.dsa;

import java.util.ArrayList;
import java.util.List;

/**
 * A Binary Search Tree implemented from scratch (no java.util.TreeMap).
 *
 * The tree is keyed by a String. For Teru Care the key is  "date|id"
 * (e.g. "2026-09-03|a1b2c3d4"). Because ISO dates sort lexicographically the
 * same way they sort chronologically, an in-order traversal yields the
 * transactions ordered by date — which is exactly Functional Requirement 6
 * ("Store transactions according to date using a Binary Search Tree").
 *
 * Operations and average complexities (O(h), h = tree height):
 *   insert      O(log n)   delete      O(log n)
 *   find        O(log n)   inOrder     O(n)
 *   rangeSearch O(log n + m), m = number of matches (pruned recursion)
 */
public class BinarySearchTree<T> {

    private static final class Node<T> {
        final String key;
        final T payload;
        Node<T> left;
        Node<T> right;

        Node(String key, T payload) {
            this.key = key;
            this.payload = payload;
        }
    }

    private Node<T> root;
    private int size;

    public int size() { return size; }
    public boolean isEmpty() { return root == null; }

    /** Insert a payload under a unique key. Ignored (returns false) if the key already exists. */
    public boolean insert(String key, T payload) {
        if (contains(key)) return false;
        root = insert(root, key, payload);
        size++;
        return true;
    }

    private Node<T> insert(Node<T> node, String key, T payload) {
        if (node == null) return new Node<>(key, payload);
        int cmp = key.compareTo(node.key);
        if (cmp < 0) node.left = insert(node.left, key, payload);
        else if (cmp > 0) node.right = insert(node.right, key, payload);
        return node;
    }

    public boolean contains(String key) {
        return find(key) != null;
    }

    /** Find the payload stored under a key, or null. */
    public T find(String key) {
        Node<T> node = root;
        while (node != null) {
            int cmp = key.compareTo(node.key);
            if (cmp == 0) return node.payload;
            node = cmp < 0 ? node.left : node.right;
        }
        return null;
    }

    /**
     * Delete the entry under a key using the classic three-case algorithm:
     *   1. leaf            -> unlink it
     *   2. one child       -> replace the node with its child
     *   3. two children    -> copy the in-order successor's key/payload into the
     *                         node, then delete the successor from the right subtree.
     * Returns the removed payload, or null when the key was not present.
     */
    public T delete(String key) {
        Holder removed = new Holder();
        root = delete(root, key, removed);
        if (removed.value != null) size--;
        @SuppressWarnings("unchecked")
        T result = (T) removed.value;
        return result;
    }

    /** Tiny mutable box so the recursive delete can hand back the removed payload. */
    private static final class Holder {
        Object value;
    }

    private Node<T> delete(Node<T> node, String key, Holder removed) {
        if (node == null) return null;
        int cmp = key.compareTo(node.key);
        if (cmp < 0) {
            node.left = delete(node.left, key, removed);
        } else if (cmp > 0) {
            node.right = delete(node.right, key, removed);
        } else {
            removed.value = node.payload;
            if (node.left == null) return node.right;   // cases 1 and 2
            if (node.right == null) return node.left;   // case 2
            // case 3: replace this node with its in-order successor
            // (the smallest key in the right subtree), then remove the
            // successor from the right subtree.
            Node<T> left = node.left;
            Node<T> right = node.right;
            Node<T> successor = min(right);
            Node<T> replacement = new Node<>(successor.key, successor.payload);
            replacement.left = left;
            Holder ignored = new Holder();
            replacement.right = delete(right, successor.key, ignored);
            node = replacement;
        }
        return node;
    }

    private Node<T> min(Node<T> node) {
        while (node.left != null) node = node.left;
        return node;
    }

    /** All payloads in ascending key order (== chronological order for date keys). */
    public List<T> inOrder() {
        List<T> out = new ArrayList<>(size);
        inOrder(root, out);
        return out;
    }

    private void inOrder(Node<T> node, List<T> out) {
        if (node == null) return;
        inOrder(node.left, out);
        out.add(node.payload);
        inOrder(node.right, out);
    }

    /** All payloads in descending key order (newest first for date keys). */
    public List<T> reverseInOrder() {
        List<T> out = new ArrayList<>(size);
        reverseInOrder(root, out);
        return out;
    }

    private void reverseInOrder(Node<T> node, List<T> out) {
        if (node == null) return;
        reverseInOrder(node.right, out);
        out.add(node.payload);
        reverseInOrder(node.left, out);
    }

    /**
     * Pruned range search: collect payloads with  fromKey <= key <= toKey  (inclusive).
     * Subtrees that cannot contain a match are skipped, so the search visits only
     * O(h + m) nodes instead of walking the whole tree.
     */
    public List<T> rangeSearch(String fromKey, String toKey) {
        List<T> out = new ArrayList<>();
        rangeSearch(root, fromKey, toKey, out);
        return out;
    }

    private void rangeSearch(Node<T> node, String fromKey, String toKey, List<T> out) {
        if (node == null) return;
        boolean aboveFrom = fromKey.compareTo(node.key) <= 0;  // node.key >= from
        boolean belowTo = toKey.compareTo(node.key) >= 0;      // node.key <= to

        if (aboveFrom) rangeSearch(node.left, fromKey, toKey, out);      // left subtree may match
        if (aboveFrom && belowTo) out.add(node.payload);                 // this node matches
        if (belowTo) rangeSearch(node.right, fromKey, toKey, out);       // right subtree may match
    }

    /** Remove every entry. */
    public void clear() {
        root = null;
        size = 0;
    }
}
