package terucare.dsa;

import java.util.ArrayList;
import java.util.List;

/**
 * A Stack implemented from scratch as a singly linked list (no java.util.Stack).
 *
 * LIFO — Last In, First Out. Every operation is O(1).
 *
 * Used by Teru Care for Functional Requirement 10: "Allow users to undo their
 * most recent expense using a Stack." Every add/delete pushes an operation
 * record; "Undo Last" pops the top record and reverses it.
 *
 * @param <T> type of the stored elements
 */
public class Stack<T> {

    private static final class Node<T> {
        final T value;
        final Node<T> below;

        Node(T value, Node<T> below) {
            this.value = value;
            this.below = below;
        }
    }

    private Node<T> top;
    private int count;

    /** Push an element onto the top of the stack. O(1). */
    public void push(T value) {
        top = new Node<>(value, top);
        count++;
    }

    /** Remove and return the top element. Returns null when the stack is empty. O(1). */
    public T pop() {
        if (top == null) return null;
        T value = top.value;
        top = top.below;
        count--;
        return value;
    }

    /** Look at the top element without removing it. Returns null when empty. O(1). */
    public T peek() {
        return top == null ? null : top.value;
    }

    public boolean isEmpty() {
        return top == null;
    }

    public int size() {
        return count;
    }

    /** Remove everything. */
    public void clear() {
        top = null;
        count = 0;
    }

    /** Snapshot of the stack, top first — used by the /api/summary diagnostics. */
    public List<T> toList() {
        List<T> out = new ArrayList<>(count);
        for (Node<T> n = top; n != null; n = n.below) out.add(n.value);
        return out;
    }
}
