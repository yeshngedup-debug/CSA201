package terucare.dsa;

import java.util.ArrayList;
import java.util.List;

/**
 * A generic Hash Table implemented from scratch (no java.util.HashMap).
 *
 * - Collision resolution: separate chaining (each bucket is a linked list of Entry nodes).
 * - Resizing: table doubles its capacity once load factor exceeds 0.75, then every
 *   entry is re-hashed into the new bucket array.
 * - Average time complexity: O(1) for put / get / remove.
 *
 * Used by Teru Care for:
 *   1. category name -> running total spent in that category  (Functional Requirement 5)
 *   2. expense id    -> Expense record                        (O(1) lookup for delete/undo)
 */
public class HashTable<K, V> {

    private static final int DEFAULT_CAPACITY = 16;
    private static final double MAX_LOAD_FACTOR = 0.75;

    /** One node of the chain inside a bucket. */
    private static final class Entry<K, V> {
        final K key;
        V value;
        Entry<K, V> next;

        Entry(K key, V value, Entry<K, V> next) {
            this.key = key;
            this.value = value;
            this.next = next;
        }
    }

    @SuppressWarnings("unchecked")
    private Entry<K, V>[] table = (Entry<K, V>[]) new Entry[DEFAULT_CAPACITY];
    private int size;

    /** Number of key-value pairs currently stored. */
    public int size() {
        return size;
    }

    public boolean isEmpty() {
        return size == 0;
    }

    /** Hash function: force the hashCode positive, then mod by table length. */
    private int indexOf(K key) {
        return (key.hashCode() & 0x7fffffff) % table.length;
    }

    /** Insert or replace the value for a key. Returns the previous value, or null. */
    public V put(K key, V value) {
        if (key == null) throw new IllegalArgumentException("HashTable key cannot be null");
        if (size >= table.length * MAX_LOAD_FACTOR) resize();

        int index = indexOf(key);
        for (Entry<K, V> e = table[index]; e != null; e = e.next) {
            if (e.key.equals(key)) {          // key already present -> replace
                V old = e.value;
                e.value = value;
                return old;
            }
        }
        // new entry: insert at the head of the chain (O(1))
        table[index] = new Entry<>(key, value, table[index]);
        size++;
        return null;
    }

    /** Look up a value by key. Returns null when the key is absent. */
    public V get(K key) {
        if (key == null) return null;
        int index = indexOf(key);
        for (Entry<K, V> e = table[index]; e != null; e = e.next) {
            if (e.key.equals(key)) return e.value;
        }
        return null;
    }

    public boolean containsKey(K key) {
        return get(key) != null;
    }

    /** Remove a key. Returns the removed value, or null when absent. */
    public V remove(K key) {
        if (key == null) return null;
        int index = indexOf(key);
        Entry<K, V> prev = null;
        for (Entry<K, V> e = table[index]; e != null; prev = e, e = e.next) {
            if (e.key.equals(key)) {
                if (prev == null) table[index] = e.next;  // head of the chain
                else prev.next = e.next;                  // middle / tail
                size--;
                return e.value;
            }
        }
        return null;
    }

    /** Every key currently stored. */
    public List<K> keys() {
        List<K> out = new ArrayList<>(size);
        for (Entry<K, V> bucket : table) {
            for (Entry<K, V> e = bucket; e != null; e = e.next) out.add(e.key);
        }
        return out;
    }

    /** Every value currently stored. */
    public List<V> values() {
        List<V> out = new ArrayList<>(size);
        for (Entry<K, V> bucket : table) {
            for (Entry<K, V> e = bucket; e != null; e = e.next) out.add(e.value);
        }
        return out;
    }

    /** Remove everything. */
    public void clear() {
        @SuppressWarnings("unchecked")
        Entry<K, V>[] fresh = (Entry<K, V>[]) new Entry[DEFAULT_CAPACITY];
        table = fresh;
        size = 0;
    }

    /**
     * Double the bucket array and re-hash every entry.
     * Re-hashing is required because the bucket index depends on table.length.
     */
    @SuppressWarnings("unchecked")
    private void resize() {
        Entry<K, V>[] old = table;
        table = (Entry<K, V>[]) new Entry[old.length * 2];
        size = 0;
        for (Entry<K, V> bucket : old) {
            for (Entry<K, V> e = bucket; e != null; e = e.next) {
                put(e.key, e.value);
            }
        }
    }
}
