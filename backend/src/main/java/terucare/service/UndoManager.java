package terucare.service;

import terucare.dsa.Stack;
import terucare.model.Expense;

/**
 * Undo manager — Functional Requirement 10: "Allow users to undo their most
 * recent expense using a Stack."
 *
 * Every mutating operation (add or delete) pushes an UndoRecord describing
 * what happened. Pressing "Undo Last" pops the most recent record and the
 * ExpenseService reverses it:
 *
 *   ADD was undone    -> the expense is removed again
 *   DELETE was undone -> the expense is restored
 */
public class UndoManager {

    public enum OpType { ADD, DELETE }

    /** One entry of the undo stack: what happened, and to which expense. */
    public record UndoRecord(OpType type, Expense expense) {
    }

    private final Stack<UndoRecord> history = new Stack<>();

    public void recordAdd(Expense expense) {
        history.push(new UndoRecord(OpType.ADD, expense));
    }

    public void recordDelete(Expense expense) {
        history.push(new UndoRecord(OpType.DELETE, expense));
    }

    /** Pop the most recent operation, or null when there is nothing to undo. */
    public UndoRecord undo() {
        return history.pop();
    }

    public boolean canUndo() {
        return !history.isEmpty();
    }

    public int size() {
        return history.size();
    }

    public void clear() {
        history.clear();
    }
}
