package terucare.store;

import terucare.model.Expense;
import terucare.server.Json;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * File persistence: the whole expense list is saved to data/expenses.json
 * after every mutation and loaded back on startup, so records survive
 * restarts (Reliability requirement).
 *
 * If the file does not exist yet, the store seeds the same 12 demo
 * transactions the frontend previously shipped with, so the dashboard looks
 * identical on first run.
 */
public class FileStore {

    private final Path file;

    public FileStore(Path file) {
        this.file = file;
    }

    /** Seed data — identical to the demo set the frontend used before the backend existed. */
    public static List<Expense> seedData() {
        List<Expense> seed = new ArrayList<>();
        seed.add(new Expense("1", "2026-09-01", 120, "Food", "Grocery run"));
        seed.add(new Expense("2", "2026-09-02", 40, "Transport", "Taxi to campus"));
        seed.add(new Expense("3", "2026-09-03", 250, "Shopping", "Stationery & notebooks"));
        seed.add(new Expense("4", "2026-09-03", 80, "Food", "Lunch with group"));
        seed.add(new Expense("5", "2026-09-04", 200, "Entertainment", "Movie night + snacks"));
        seed.add(new Expense("6", "2026-09-04", 60, "Transport", "Bus pass"));
        seed.add(new Expense("7", "2026-09-05", 150, "Health", "Pharmacy"));
        seed.add(new Expense("8", "2026-09-05", 90, "Utilities", "Electricity bill"));
        seed.add(new Expense("9", "2026-09-06", 35, "Food", "Coffee & pastry"));
        seed.add(new Expense("10", "2026-09-06", 45, "Education", "Online course"));
        seed.add(new Expense("11", "2026-09-07", 180, "Shopping", "New shoes"));
        seed.add(new Expense("12", "2026-09-07", 50, "Food", "Dinner out"));
        return seed;
    }

    /**
     * Load all expenses from disk. Returns the seed list when the file is
     * missing or unreadable, so the app always starts with usable data.
     */
    public List<Expense> load() {
        if (!Files.exists(file)) return seedData();
        try {
            String text = Files.readString(file, StandardCharsets.UTF_8);
            Object parsed = Json.parse(text);
            if (!(parsed instanceof List<?> list)) return seedData();
            List<Expense> out = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    out.add(new Expense(
                            String.valueOf(m.get("id")),
                            String.valueOf(m.get("date")),
                            ((Number) m.get("amount")).doubleValue(),
                            String.valueOf(m.get("category")),
                            String.valueOf(m.get("description"))));
                }
            }
            return out;
        } catch (Exception e) {
            // Never destroy real data: move the unreadable file aside (e.g. a
            // OneDrive sync conflict or a hand-edited row) before falling back
            // to the seed list, so it can be recovered manually.
            try {
                Files.move(file, file.resolveSibling(file.getFileName() + ".bad"),
                        StandardCopyOption.REPLACE_EXISTING);
                System.err.println("[FileStore] Unreadable " + file.getFileName()
                        + " kept as " + file.getFileName() + ".bad (" + e.getMessage() + ")");
            } catch (IOException moveError) {
                System.err.println("[FileStore] Could not read " + file + " (" + e.getMessage() + ")");
            }
            return seedData();
        }
    }

    /** Write the full expense list to disk (atomic: temp file + move). */
    public void save(List<Expense> expenses) {
        List<Object> rows = new ArrayList<>();
        for (Expense e : expenses) {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", e.getId());
            row.put("date", e.getDate());
            row.put("amount", e.getAmount());
            row.put("category", e.getCategory());
            row.put("description", e.getDescription());
            rows.add(row);
        }
        String json = Json.write(rows);
        try {
            Files.createDirectories(file.getParent());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, json, StandardCharsets.UTF_8);
            try {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException amnse) {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            System.err.println("[FileStore] Could not save " + file + ": " + e.getMessage());
        }
    }
}
