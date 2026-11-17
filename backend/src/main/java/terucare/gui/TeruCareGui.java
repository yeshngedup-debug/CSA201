package terucare.gui;

import terucare.server.Json;
import terucare.service.ExpenseService;

import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.BoxLayout;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Teru Care desktop GUI — a Swing client for the Teru Care REST API.
 *
 * The React/Vite web frontend and this desktop app are two thin clients of
 * the same backend; every mutation still flows through ExpenseService, so the
 * hand-written BST / HashTable / Stack / MergeSort structures are exercised
 * either way. Plain JDK only: Swing + java.net.http.HttpClient + the
 * backend's own Json parser.
 *
 *   compile:  javac -encoding UTF-8 -d out (same source tree as the server)
 *   run:      java -cp out terucare.gui.TeruCareGui
 *
 * Backend base URL: TERU_API_URL env var, else http://localhost:8090/api
 */
public final class TeruCareGui {

    private static final Color CREAM = new Color(0xFF, 0xF8, 0xE6);
    private static final Color AMBER = new Color(0xFF, 0xC1, 0x07);
    private static final Color INK = new Color(0x14, 0x26, 0x1C);
    private static final Color SAGE = new Color(0x5C, 0x6E, 0x63);
    private static final Color RED = new Color(0xB9, 0x1C, 0x1C);
    private static final Color GREEN = new Color(0x15, 0x80, 0x3D);
    private static final Color PANEL = new Color(0xFF, 0xFF, 0xFF);

    private final String api;
    private final HttpClient http = HttpClient.newHttpClient();

    // UI pieces populated by show()
    private JFrame frame;
    private final ExpenseTableModel tableModel = new ExpenseTableModel();
    private JTable table;
    private JPanel barsPanel;
    private JLabel totalLabel;
    private JLabel countLabel;
    private JLabel avgLabel;
    private JLabel topLabel;
    private JLabel statusLabel;
    private JLabel bannerLabel;
    private JPanel banner;
    private JButton addButton;
    private JButton undoButton;
    private JButton deleteButton;
    private JButton clearButton;
    private JButton refreshButton;
    private JTextField dateField;
    private JTextField amountField;
    private JTextField descField;
    private JTextField searchField;
    private JComboBox<String> categoryCombo;

    private String lastQuery = "";

    public TeruCareGui(String api) {
        this.api = api.endsWith("/") ? api.substring(0, api.length() - 1) : api;
    }

    public static void main(String[] args) {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
            // fall back to the default cross-platform look and feel
        }
        String api = System.getenv().getOrDefault("TERU_API_URL", "http://localhost:8090/api");
        SwingUtilities.invokeLater(() -> new TeruCareGui(api).show());
    }

    // ─── UI construction ────────────────────────────────────────────────

    public void show() {
        // ASCII title (no parentheses) so start.bat/stop.bat can match the
        // window reliably - cmd blocks do not protect parens with quotes.
        frame = new JFrame("Teru Care - Expense Tracker");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.setLayout(new BorderLayout());

        // Banner + header share the NORTH slot, so stack them in a wrapper.
        JPanel top = new JPanel(new BorderLayout());
        top.setOpaque(false);
        banner = buildBanner();
        top.add(banner, BorderLayout.NORTH);
        top.add(buildHeader(), BorderLayout.CENTER);
        frame.add(top, BorderLayout.NORTH);

        JPanel center = new JPanel(new BorderLayout(12, 0));
        center.setBackground(CREAM);
        center.setBorder(new EmptyBorder(12, 12, 12, 12));
        center.add(buildLeftPanel(), BorderLayout.WEST);
        center.add(buildTablePanel(), BorderLayout.CENTER);
        frame.add(center, BorderLayout.CENTER);

        frame.add(buildFormPanel(), BorderLayout.SOUTH);
        frame.setSize(1024, 680);
        frame.setMinimumSize(new Dimension(880, 560));
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);

        healthCheckThenRefresh();
    }

    private JPanel buildHeader() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(AMBER);
        header.setBorder(new EmptyBorder(10, 16, 10, 16));

        JPanel titles = new JPanel(new GridLayout(2, 1));
        titles.setOpaque(false);
        JLabel title = new JLabel("Teru Care");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 20f));
        title.setForeground(INK);
        JLabel subtitle = new JLabel("Personal Finance & Expense Tracker — Java desktop client");
        subtitle.setFont(subtitle.getFont().deriveFont(12f));
        subtitle.setForeground(INK);
        titles.add(title);
        titles.add(subtitle);
        header.add(titles, BorderLayout.WEST);

        refreshButton = new JButton("Refresh");
        refreshButton.addActionListener(e -> refresh(lastQuery));
        header.add(refreshButton, BorderLayout.EAST);
        return header;
    }

    private JPanel buildBanner() {
        banner = new JPanel(new BorderLayout(8, 0));
        banner.setBackground(new Color(0xFE, 0xE2, 0xE2));
        banner.setBorder(new EmptyBorder(8, 16, 8, 16));
        bannerLabel = new JLabel("Cannot reach the Teru Care API. Start the backend first (start.bat or backend\\run.bat).");
        bannerLabel.setForeground(RED);
        JButton retry = new JButton("Retry");
        retry.addActionListener(e -> healthCheckThenRefresh());
        banner.add(bannerLabel, BorderLayout.CENTER);
        banner.add(retry, BorderLayout.EAST);
        banner.setVisible(false);
        return banner;
    }

    private JPanel buildLeftPanel() {
        JPanel left = new JPanel();
        left.setLayout(new BoxLayout(left, BoxLayout.Y_AXIS));
        left.setBackground(CREAM);

        JPanel stats = new JPanel(new GridLayout(2, 2, 8, 8));
        stats.setOpaque(false);
        totalLabel = statCard(stats, "TOTAL SPENT", "Nu. 0.00");
        countLabel = statCard(stats, "TRANSACTIONS", "0");
        avgLabel = statCard(stats, "AVERAGE", "Nu. 0.00");
        topLabel = statCard(stats, "TOP CATEGORY", "—");
        left.add(stats);

        left.add(javax.swing.Box.createVerticalStrut(12));

        JPanel ranked = new JPanel(new BorderLayout());
        ranked.setOpaque(false);
        ranked.setBorder(new TitledBorder("Top spending categories (Merge Sort)"));
        barsPanel = new JPanel();
        barsPanel.setLayout(new BoxLayout(barsPanel, BoxLayout.Y_AXIS));
        barsPanel.setOpaque(false);
        barsPanel.setBorder(new EmptyBorder(4, 6, 6, 6));
        JScrollPane scroll = new JScrollPane(barsPanel);
        scroll.setBorder(null);
        scroll.setOpaque(false);
        scroll.getViewport().setOpaque(false);
        scroll.setPreferredSize(new Dimension(300, 170));
        ranked.add(scroll, BorderLayout.CENTER);
        left.add(ranked);

        JPanel undoPreview = new JPanel(new BorderLayout());
        undoPreview.setOpaque(false);
        undoPreview.setBorder(new TitledBorder("About this app"));
        JLabel about = new JLabel("<html>Desktop client for the same API the<br>"
                + "web app uses. The CSA201 DSA<br>"
                + "structures (BST, HashTable,<br>"
                + "Stack, MergeSort) back every<br>"
                + "number on this screen.</html>");
        about.setForeground(SAGE);
        about.setBorder(new EmptyBorder(4, 8, 8, 8));
        undoPreview.add(about, BorderLayout.CENTER);
        left.add(javax.swing.Box.createVerticalStrut(12));
        left.add(undoPreview);

        left.setPreferredSize(new Dimension(320, 0));
        return left;
    }

    private JLabel statCard(JPanel parent, String caption, String value) {
        JPanel card = new JPanel(new BorderLayout());
        card.setBackground(PANEL);
        card.setBorder(new EmptyBorder(10, 12, 10, 12));
        JLabel cap = new JLabel(caption);
        cap.setFont(cap.getFont().deriveFont(Font.BOLD, 10f));
        cap.setForeground(SAGE);
        JLabel val = new JLabel(value);
        val.setFont(val.getFont().deriveFont(Font.BOLD, 16f));
        val.setForeground(INK);
        card.add(cap, BorderLayout.NORTH);
        card.add(val, BorderLayout.CENTER);
        parent.add(card);
        return val;
    }

    private JPanel buildTablePanel() {
        JPanel right = new JPanel(new BorderLayout(0, 8));
        right.setOpaque(false);

        JPanel searchRow = new JPanel(new BorderLayout(8, 0));
        searchRow.setOpaque(false);
        searchField = new JTextField();
        searchField.putClientProperty("JTextField.placeholderText", "Search descriptions… (press Enter)");
        searchField.setToolTipText("Filter by description (uses the API's q= parameter)");
        searchField.addActionListener(e -> applySearch());
        JLabel caption = new JLabel("Search");
        caption.setForeground(INK);
        searchRow.add(caption, BorderLayout.WEST);
        searchRow.add(searchField, BorderLayout.CENTER);
        JButton clearSearch = new JButton("Clear");
        clearSearch.addActionListener(e -> {
            searchField.setText("");
            applySearch();
        });
        searchRow.add(clearSearch, BorderLayout.EAST);
        right.add(searchRow, BorderLayout.NORTH);

        table = new JTable(tableModel);
        table.setRowHeight(26);
        table.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
        table.setAutoCreateRowSorter(true);
        table.setFillsViewportHeight(true);
        table.setBackground(PANEL);
        table.getColumnModel().getColumn(3).setCellRenderer(new RightAlignRenderer());
        table.getColumnModel().getColumn(3).setPreferredWidth(110);
        table.getColumnModel().getColumn(0).setPreferredWidth(95);
        table.getColumnModel().getColumn(1).setPreferredWidth(220);
        table.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting()) syncActionButtons();
        });
        right.add(new JScrollPane(table), BorderLayout.CENTER);
        return right;
    }

    private JPanel buildFormPanel() {
        JPanel south = new JPanel(new BorderLayout(0, 6));
        south.setBackground(CREAM);
        south.setBorder(new EmptyBorder(0, 12, 10, 12));

        JPanel form = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 6));
        form.setOpaque(false);
        form.setBorder(new TitledBorder("Add expense"));

        dateField = field(LocalDate.now().toString(), 10);
        amountField = field("", 8);
        categoryCombo = new JComboBox<>(ExpenseService.CATEGORIES.toArray(new String[0]));
        descField = field("", 26);

        form.add(new JLabel("Date"));
        form.add(dateField);
        form.add(new JLabel("Amount"));
        form.add(amountField);
        form.add(new JLabel("Category"));
        form.add(categoryCombo);
        form.add(new JLabel("Description"));
        form.add(descField);

        addButton = new JButton("Add expense");
        addButton.setBackground(AMBER);
        addButton.setForeground(INK);
        addButton.addActionListener(e -> addExpense());
        form.add(addButton);
        south.add(form, BorderLayout.NORTH);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 2));
        actions.setOpaque(false);
        undoButton = action("Undo last", e -> undo());
        deleteButton = action("Delete selected", e -> deleteSelected());
        clearButton = action("Clear all data", e -> clearAll());
        actions.add(undoButton);
        actions.add(deleteButton);
        actions.add(clearButton);
        south.add(actions, BorderLayout.CENTER);

        statusLabel = new JLabel("Connecting to the API…");
        statusLabel.setBorder(new EmptyBorder(2, 4, 0, 4));
        statusLabel.setForeground(SAGE);
        south.add(statusLabel, BorderLayout.SOUTH);

        frame.getRootPane().setDefaultButton(addButton);
        return south;
    }

    private JButton action(String label, java.awt.event.ActionListener handler) {
        JButton button = new JButton(label);
        button.addActionListener(handler);
        return button;
    }

    private JTextField field(String text, int columns) {
        JTextField field = new JTextField(text, columns);
        return field;
    }

    // ─── Actions ────────────────────────────────────────────────────────

    private void applySearch() {
        lastQuery = searchField.getText().trim();
        refresh(lastQuery);
    }

    private void addExpense() {
        String date = dateField.getText().trim();
        String amountText = amountField.getText().trim();
        String category = (String) categoryCombo.getSelectedItem();
        String description = descField.getText().trim();

        try {
            LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            fail("Date must be in yyyy-MM-dd format (e.g. " + LocalDate.now() + ")");
            return;
        }
        double amount;
        try {
            amount = Double.parseDouble(amountText);
        } catch (NumberFormatException ex) {
            fail("Amount must be a number, e.g. 120.50");
            return;
        }
        if (!(amount > 0) || amount > 1_000_000) {
            fail("Amount must be greater than 0 and at most 1,000,000");
            return;
        }
        if (description.isBlank()) {
            fail("Description is required");
            return;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("date", date);
        body.put("amount", amount);
        body.put("category", category);
        body.put("description", description);

        postJson("/expenses", body, result -> {
            Map<?, ?> saved = (Map<?, ?>) result.get("expense");
            ok("Added: " + saved.get("description") + " (" + money(saved.get("amount")) + ")");
            descField.setText("");
            amountField.setText("");
            refresh(lastQuery);
        });
    }

    private void undo() {
        postJson("/undo", Map.of(), result -> {
            String action = String.valueOf(result.get("action"));
            Map<?, ?> expense = (Map<?, ?>) result.get("expense");
            if ("skipped".equals(action)) {
                info("Undo skipped — that expense was re-added after deletion");
            } else {
                ok("Undid last action: " + action + " " + expense.get("description"));
            }
            refresh(lastQuery);
        });
    }

    private void deleteSelected() {
        int row = table.getSelectedRow();
        if (row < 0) {
            fail("Select a row in the table first");
            return;
        }
        String id = tableModel.idAt(table.convertRowIndexToModel(row));
        String description = String.valueOf(tableModel.getValueAt(table.convertRowIndexToModel(row), 1));
        int choice = JOptionPane.showConfirmDialog(frame,
                "Delete \"" + description + "\"?", "Confirm delete", JOptionPane.YES_NO_OPTION);
        if (choice != JOptionPane.YES_OPTION) return;

        delete("/expenses/" + URLEncoder.encode(id, StandardCharsets.UTF_8), result -> {
            ok("Deleted: " + description);
            refresh(lastQuery);
        });
    }

    private void clearAll() {
        int choice = JOptionPane.showConfirmDialog(frame,
                "Delete ALL expenses? The undo stack is cleared too.", "Confirm clear all",
                JOptionPane.YES_NO_OPTION);
        if (choice != JOptionPane.YES_OPTION) return;

        delete("/expenses", result -> {
            ok("Cleared all data");
            refresh(lastQuery);
        });
    }

    // ─── Data loading ───────────────────────────────────────────────────

    private void healthCheckThenRefresh() {
        runApi("health check", () -> get("/health"), body -> {
            banner.setVisible(false);
            setFormEnabled(true);
            refresh("");
        }, failure -> {
            banner.setVisible(true);
            setFormEnabled(false);
            setStatus("Backend not reachable: " + firstLine(failure), RED);
        });
    }

    private void refresh(String query) {
        runApi("load expenses", () -> {
            String path = "/expenses" + (query == null || query.isBlank()
                    ? "" : "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("expenses", object(get(path)));
            out.put("summary", object(get("/summary")));
            out.put("ranked", object(get("/categories/ranked")));
            return Json.write(out);
        }, body -> {
            Map<String, Object> all = object(body);
            applyResults(
                    (List<?>) ((Map<?, ?>) all.get("expenses")).get("expenses"),
                    (Map<?, ?>) all.get("summary"),
                    (List<?>) ((Map<?, ?>) all.get("ranked")).get("categories"));
        }, null);
    }

    @SuppressWarnings("unchecked")
    private void applyResults(List<?> expenses, Map<?, ?> summary, List<?> ranked) {
        tableModel.setRows(expenses);
        totalLabel.setText(money(summary.get("total")));
        Object count = summary.get("count");
        countLabel.setText(count instanceof Number n ? String.valueOf(n.longValue()) : String.valueOf(count));
        avgLabel.setText(money(summary.get("average")));
        Object top = summary.get("topCategory");
        topLabel.setText(top == null ? "—" : String.valueOf(top));
        canUndo = Boolean.TRUE.equals(summary.get("canUndo"));
        undoButton.setEnabled(canUndo);
        renderCategories(ranked);
        setStatus("Loaded " + expenses.size() + " expense" + (expenses.size() == 1 ? "" : "s"), GREEN);
    }

    private void renderCategories(List<?> ranked) {
        barsPanel.removeAll();
        for (Object item : ranked) {
            Map<?, ?> row = (Map<?, ?>) item;
            String category = String.valueOf(row.get("category"));
            double total = ((Number) row.get("total")).doubleValue();
            double pct = ((Number) row.get("percentage")).doubleValue();

            JPanel line = new JPanel(new BorderLayout(6, 0));
            line.setOpaque(false);
            line.setMaximumSize(new Dimension(Integer.MAX_VALUE, 26));
            JLabel name = new JLabel(category);
            name.setPreferredSize(new Dimension(105, 22));
            name.setForeground(INK);
            JProgressBar bar = new JProgressBar(0, 100);
            bar.setValue((int) Math.round(pct));
            bar.setForeground(AMBER);
            bar.setBackground(new Color(0xF1, 0xE7, 0xD0));
            bar.setBorderPainted(false);
            JLabel value = new JLabel(money(total) + "  ·  " + String.format(Locale.US, "%.1f%%", pct));
            value.setForeground(SAGE);
            value.setFont(value.getFont().deriveFont(11f));
            line.add(name, BorderLayout.WEST);
            line.add(bar, BorderLayout.CENTER);
            line.add(value, BorderLayout.EAST);
            barsPanel.add(line);
        }
        barsPanel.revalidate();
        barsPanel.repaint();
    }

    // ─── HTTP + shared helpers ─────────────────────────────────────────

    private interface ThrowingSupplier {
        String get() throws Exception;
    }

    /** One HTTP round-trip. Paths are appended to the configured API base. */
    private ApiResult request(String method, String path, String jsonBody) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(api + path));
        switch (method) {
            case "GET" -> builder.GET();
            case "POST" -> builder.header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody == null ? "{}" : jsonBody));
            case "DELETE" -> builder.DELETE();
            default -> throw new IllegalArgumentException("Unsupported method: " + method);
        }
        HttpResponse<String> res = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        return new ApiResult(res.statusCode(), res.body());
    }

    private static final class ApiResult {
        final int status;
        final String body;

        ApiResult(int status, String body) {
            this.status = status;
            this.body = body == null ? "" : body;
        }

        boolean ok() {
            return status >= 200 && status < 300;
        }
    }

    private static final class ApiError extends Exception {
        final int status;
        final String body;

        ApiError(int status, String body) {
            super("HTTP " + status);
            this.status = status;
            this.body = body == null ? "" : body;
        }
    }

    private String get(String path) throws Exception {
        ApiResult res = request("GET", path, null);
        if (!res.ok()) throw new ApiError(res.status, res.body);
        return res.body;
    }

    private void runApi(String task, ThrowingSupplier work,
                        java.util.function.Consumer<String> onOk,
                        java.util.function.Consumer<String> onError) {
        setBusy(true);
        new SwingWorker<String, Void>() {
            String error;
            String detail;

            @Override
            protected String doInBackground() {
                try {
                    return work.get();
                } catch (ApiError e) {
                    detail = extractError(e.status, e.body, "HTTP " + e.status);
                    return null;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    error = "interrupted";
                    return null;
                } catch (Exception e) {
                    error = firstLine(String.valueOf(e.getMessage()));
                    return null;
                }
            }

            @Override
            protected void done() {
                setBusy(false);
                if (error == null && detail == null) {
                    try {
                        onOk.accept(get());
                    } catch (Exception e) {
                        fail(task + " failed — " + firstLine(String.valueOf(e.getMessage())));
                    }
                    return;
                }
                String message = detail != null ? detail : error;
                if (onError != null) {
                    onError.accept(message);
                    return;
                }
                fail(task + " failed — " + message);
            }
        }.execute();
    }

    private void postJson(String path, Object payload,
                          java.util.function.Consumer<Map<String, Object>> onOk) {
        runApi("Save", () -> {
            ApiResult res = request("POST", path, Json.write(payload));
            if (!res.ok()) throw new ApiError(res.status, res.body);
            return res.body;
        }, body -> onOk.accept(object(body)), null);
    }

    private void delete(String path, java.util.function.Consumer<Map<String, Object>> onOk) {
        runApi("Delete", () -> {
            ApiResult res = request("DELETE", path, null);
            if (!res.ok()) throw new ApiError(res.status, res.body);
            return res.body;
        }, body -> onOk.accept(object(body)), null);
    }

    /** Pull the server's {error} (or {fields:{...}}) out of a failed response. */
    private String extractError(int status, String body, String fallback) {
        if (body != null && !body.isBlank()) {
            try {
                Map<?, ?> parsed = object(body);
                Object fields = parsed.get("fields");
                if (fields instanceof Map<?, ?> f && !f.isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (Map.Entry<?, ?> e : f.entrySet()) {
                        if (sb.length() > 0) sb.append(" · ");
                        sb.append(e.getKey()).append(": ").append(e.getValue());
                    }
                    return sb.toString();
                }
                Object error = parsed.get("error");
                if (error != null) return String.valueOf(error);
            } catch (Exception ignored) {
                // body was not JSON — fall through to the raw first line
            }
            return firstLine(body);
        }
        return fallback != null ? fallback : "HTTP " + status;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(String json) {
        Object parsed = Json.parse(json);
        if (!(parsed instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException("Expected a JSON object from the API");
        }
        return (Map<String, Object>) map;
    }

    private static String money(Object value) {
        if (!(value instanceof Number n)) return "Nu. 0.00";
        return String.format(Locale.US, "Nu. %,.2f", n.doubleValue());
    }

    private static String firstLine(String text) {
        if (text == null || text.isBlank()) return "unknown error";
        int end = text.indexOf('\n');
        return end >= 0 ? text.substring(0, end).trim() : text.trim();
    }

    private void ok(String message) { setStatus(message, GREEN); }

    private void info(String message) { setStatus(message, SAGE); }

    private void fail(String message) { setStatus(message, RED); }

    private void setStatus(String message, Color color) {
        statusLabel.setText(message);
        statusLabel.setForeground(color);
    }

    private boolean canUndo = false;

    private void setBusy(boolean busy) {
        if (addButton == null) return;
        addButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy);
        clearButton.setEnabled(!busy);
        undoButton.setEnabled(!busy && canUndo);
        deleteButton.setEnabled(!busy && table.getSelectedRow() >= 0);
        frame.setCursor(busy ? Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR) : null);
    }

    private void setFormEnabled(boolean enabled) {
        dateField.setEnabled(enabled);
        amountField.setEnabled(enabled);
        categoryCombo.setEnabled(enabled);
        descField.setEnabled(enabled);
        searchField.setEnabled(enabled);
        addButton.setEnabled(enabled);
        refreshButton.setEnabled(enabled);
        clearButton.setEnabled(enabled);
        undoButton.setEnabled(enabled && canUndo);
        deleteButton.setEnabled(false);
        frame.setCursor(null);
    }

    private void syncActionButtons() {
        if (deleteButton == null || addButton == null) return;
        deleteButton.setEnabled(table.getSelectedRow() >= 0 && addButton.isEnabled());
    }

    // ─── Table model + renderer ─────────────────────────────────────────

    private static final class ExpenseTableModel extends DefaultTableModel {
        private static final String[] COLUMNS = {"Date", "Description", "Category", "Amount"};
        private final List<Map<String, Object>> rows = new ArrayList<>();

        ExpenseTableModel() {
            super(COLUMNS, 0);
        }

        void setRows(List<?> raw) {
            rows.clear();
            for (Object item : raw) {
                if (item instanceof Map<?, ?> m) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> row = (Map<String, Object>) m;
                    rows.add(row);
                }
            }
            fireTableDataChanged();
        }

        @Override
        public int getRowCount() {
            // DefaultTableModel's constructor calls this before field
            // initializers run, so rows can still be null at that point.
            return rows == null ? 0 : rows.size();
        }

        @Override
        public int getColumnCount() {
            return COLUMNS.length;
        }

        @Override
        public boolean isCellEditable(int row, int column) {
            return false;
        }

        @Override
        public Object getValueAt(int row, int column) {
            Map<String, Object> expense = rows.get(row);
            return switch (column) {
                case 0 -> expense.get("date");
                case 1 -> expense.get("description");
                case 2 -> expense.get("category");
                case 3 -> money(expense.get("amount"));
                default -> null;
            };
        }

        String idAt(int row) {
            return String.valueOf(rows.get(row).get("id"));
        }
    }

    private static final class RightAlignRenderer extends DefaultTableCellRenderer {
        @Override
        public Component getTableCellRendererComponent(JTable table, Object value,
                boolean isSelected, boolean hasFocus, int row, int column) {
            super.getTableCellRendererComponent(table, value, isSelected, hasFocus, row, column);
            setHorizontalAlignment(SwingConstants.RIGHT);
            return this;
        }
    }
}

