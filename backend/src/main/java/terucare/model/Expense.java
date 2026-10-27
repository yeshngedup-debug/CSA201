package terucare.model;

/**
 * Immutable expense record — the single unit of data in the whole system.
 * An Expense flows: UI -> REST API -> ExpenseService -> (BST + HashTable + Stack) -> FileStore.
 */
public final class Expense {

    private final String id;
    private final String date;        // ISO format: yyyy-MM-dd (sorts lexicographically == chronologically)
    private final double amount;      // Ngultrum (Nu.)
    private final String category;    // one of the 8 fixed categories
    private final String description; // what the money was spent on

    public Expense(String id, String date, double amount, String category, String description) {
        this.id = id;
        this.date = date;
        this.amount = amount;
        this.category = category;
        this.description = description;
    }

    public String getId() { return id; }
    public String getDate() { return date; }
    public double getAmount() { return amount; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }

    /** The unique key used to position this expense inside the Binary Search Tree. */
    public String bstKey() { return date + "|" + id; }

    @Override
    public String toString() {
        return "Expense{id=" + id + ", date=" + date + ", amount=" + amount
                + ", category=" + category + ", description=" + description + "}";
    }
}
