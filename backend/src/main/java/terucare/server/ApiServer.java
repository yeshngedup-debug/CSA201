package terucare.server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import terucare.model.Expense;
import terucare.service.ExpenseService;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * REST API built on the JDK's built-in HttpServer (com.sun.net.httpserver) —
 * again, zero external dependencies.
 *
 * The React frontend (Vite dev server, port 8443) talks to this API on port
 * 8080. CORS headers are sent on every response so the browser allows the
 * cross-origin calls during development.
 *
 * Endpoints:
 *   GET    /api/health                 liveness check
 *   GET    /api/expenses               all expenses, newest first (+ canUndo)
 *   POST   /api/expenses               add an expense        {date, amount, category, description}
 *   DELETE /api/expenses/{id}          delete one expense
 *   DELETE /api/expenses               clear all data
 *   GET    /api/expenses/range?from=&to=   BST date-range search
 *   GET    /api/categories/ranked      HashTable totals + MergeSort ranking
 *   GET    /api/summary                totals, average, top category
 *   POST   /api/undo                   pop the undo Stack
 */
public class ApiServer {

    private final ExpenseService service;
    private final int port;
    private HttpServer server;

    public ApiServer(ExpenseService service, int port) {
        this.service = service;
        this.port = port;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api", this::handle);
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
    }

    public void stop() {
        if (server != null) server.stop(0);
    }

    // ─── Routing ─────────────────────────────────────────────────────────

    private void handle(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        String method = exchange.getRequestMethod();
        if (method.equals("OPTIONS")) {           // CORS preflight
            respond(exchange, 204, null);
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String query = exchange.getRequestURI().getQuery();
        try {
            route(exchange, method, path, query);
        } catch (ExpenseService.ValidationException e) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("error", e.getMessage());
            body.put("fields", e.fields);
            respond(exchange, 400, body);
        } catch (IllegalArgumentException e) {   // includes Json.ParseException
            respond(exchange, 400, Map.of("error", safeMessage(e)));
        } catch (Exception e) {
            System.err.println("[ApiServer] Unhandled error on " + method + " " + path);
            e.printStackTrace();
            respond(exchange, 500, Map.of("error", "Internal server error"));
        } finally {
            exchange.close();
        }
    }

    private void route(HttpExchange exchange, String method, String path, String query)
            throws IOException, ExpenseService.ValidationException {
        switch (method) {
            case "GET" -> {
                if (path.equals("/api/health")) {
                    respond(exchange, 200, Map.of("status", "ok", "app", "Teru Care"));
                } else if (path.equals("/api/stats")) {
                    Map<String, Object> stats = new LinkedHashMap<>(service.summary());
                    stats.put("canUndo", service.canUndo());
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("count", stats.getOrDefault("count", 0));
                    body.put("total", stats.getOrDefault("total", 0.0));
                    body.put("topCategory", stats.getOrDefault("topCategory", null));
                    body.put("canUndo", stats.get("canUndo"));
                    respond(exchange, 200, body);
                } else if (path.equals("/api/expenses")) {
                    Map<String, String> params = parseQuery(query);
                    List<Expense> all = service.listAll();
                    String q = params.get("q");
                    if (q != null && !q.isBlank()) {
                        String qLower = q.toLowerCase();
                        List<Expense> filtered = new java.util.ArrayList<>();
                        for (Expense e : all) {
                            if (e.getDescription() != null && e.getDescription().toLowerCase().contains(qLower))
                                filtered.add(e);
                        }
                        all = filtered;
                    }
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("expenses", expenseList(all));
                    body.put("canUndo", service.canUndo());
                    respond(exchange, 200, body);
                } else if (path.equals("/api/expenses/range")) {
                    Map<String, String> params = parseQuery(query);
                    String categoryFilter = params.get("category");
                    List<Expense> found;
                    try {
                        found = service.searchByDateRange(
                                params.getOrDefault("from", ""), params.getOrDefault("to", ""));
                    } catch (IllegalArgumentException ex) {
                        Map<String, Object> err = new LinkedHashMap<>();
                        err.put("error", ex.getMessage());
                        respond(exchange, 400, err);
                        return;
                    }
                    if (categoryFilter != null && !categoryFilter.isBlank()) {
                        List<Expense> filtered = new java.util.ArrayList<>();
                        for (Expense e : found) {
                            if (categoryFilter.equalsIgnoreCase(e.getCategory())) filtered.add(e);
                        }
                        found = filtered;
                    }
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("from", params.get("from"));
                    body.put("to", params.get("to"));
                    body.put("category", categoryFilter);
                    body.put("expenses", expenseList(found));
                    respond(exchange, 200, body);
                } else if (path.equals("/api/categories/ranked")) {
                    List<Map.Entry<String, Double>> ranked = service.rankedCategories();
                    List<Map<String, Object>> rows = new java.util.ArrayList<>();
                    double grand = ranked.stream().mapToDouble(Map.Entry::getValue).sum();
                    for (Map.Entry<String, Double> e : ranked) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("category", e.getKey());
                        row.put("total", e.getValue());
                        row.put("percentage", grand == 0 ? 0 : Math.round(e.getValue() / grand * 1000.0) / 10.0);
                        rows.add(row);
                    }
                    respond(exchange, 200, Map.of("categories", rows));
                } else if (path.equals("/api/expenses/export")) {
                    List<Expense> expenses = service.listAll();
                    StringBuilder csv = new StringBuilder();
                    csv.append("id,date,amount,category,description,note\r\n");
                    for (Expense e : expenses) {
                        csv.append(escapeCsv(e.getId())).append(",");
                        csv.append(escapeCsv(e.getDate())).append(",");
                        csv.append(escapeCsv(String.format("%.2f", e.getAmount()))).append(",");
                        csv.append(escapeCsv(e.getCategory())).append(",");
                        csv.append(escapeCsv(e.getDescription())).append(",");
                        csv.append(escapeCsv(e.getNote() == null ? "" : e.getNote())).append("\r\n");
                    }
                    byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().add("Content-Type", "text/csv; charset=utf-8");
                    exchange.getResponseHeaders().add("Content-Disposition", "attachment; filename=expenses.csv");
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
                } else if (path.equals("/api/summary")) {
                    respond(exchange, 200, service.summary());
                } else {
                    respond(exchange, 404, Map.of("error", "Not found: GET " + path));
                }
            }
            case "POST" -> {
                if (path.equals("/api/expenses")) {
                    Map<?, ?> body = readJsonObject(exchange);
                    Expense candidate = new Expense(
                            str(body.get("id")),
                            str(body.get("date")),
                            num(body.get("amount")),
                            str(body.get("category")),
                            str(body.get("description")),
                            str(body.get("note")));
                    Expense saved = service.add(candidate);
                    respond(exchange, 201, Map.of("expense", expenseMap(saved), "canUndo", true));
                } else if (path.equals("/api/undo")) {
                    Map<String, Object> result = service.undo();
                    if (result == null) {
                        respond(exchange, 404, Map.of("error", "Nothing to undo"));
                    } else {
                        Map<String, Object> body = new LinkedHashMap<>(result);
                        body.put("expense", expenseMap((Expense) result.get("expense")));
                        respond(exchange, 200, body);
                    }
                } else {
                    respond(exchange, 404, Map.of("error", "Not found: POST " + path));
                }
            }
            case "DELETE" -> {
                if (path.equals("/api/expenses")) {
                    service.clearAll();
                    respond(exchange, 200, Map.of("cleared", true, "canUndo", false));
                } else if (path.startsWith("/api/expenses/")) {
                    String id = URLDecoder.decode(path.substring("/api/expenses/".length()), StandardCharsets.UTF_8);
                    Expense removed = service.delete(id);
                    if (removed == null) {
                        respond(exchange, 404, Map.of("error", "No expense with id " + id));
                    } else {
                        respond(exchange, 200, Map.of("expense", expenseMap(removed), "canUndo", true));
                    }
                } else {
                    respond(exchange, 404, Map.of("error", "Not found: DELETE " + path));
                }
            }
            default -> respond(exchange, 405, Map.of("error", "Method not allowed: " + method));
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private List<Map<String, Object>> expenseList(List<Expense> expenses) {
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Expense e : expenses) out.add(expenseMap(e));
        return out;
    }

    private Map<String, Object> expenseMap(Expense e) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("date", e.getDate());
        map.put("amount", e.getAmount());
        map.put("category", e.getCategory());
        map.put("description", e.getDescription());
        map.put("note", e.getNote() == null ? "" : e.getNote());
        return map;
    }

    private Map<?, ?> readJsonObject(HttpExchange exchange) throws IOException {
        byte[] bytes = exchange.getRequestBody().readAllBytes();
        if (bytes.length == 0) throw new Json.ParseException("Request body is empty");
        Object parsed = Json.parse(new String(bytes, StandardCharsets.UTF_8));
        if (!(parsed instanceof Map<?, ?> map)) throw new Json.ParseException("Request body must be a JSON object");
        return map;
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> params = new LinkedHashMap<>();
        if (query == null || query.isBlank()) return params;
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq < 0) {
                params.put(URLDecoder.decode(pair, StandardCharsets.UTF_8), "");
            } else {
                params.put(URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8),
                        URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8));
            }
        }
        return params;
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static double num(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        if (o instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return Double.NaN;   // fails validation with a clear message
            }
        }
        return Double.NaN;
    }

    private static String escapeCsv(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    private static String safeMessage(Exception e) {
        String m = e.getMessage();
        return m == null ? e.getClass().getSimpleName() : m;
    }

    private void addCorsHeaders(HttpExchange exchange) {
        // Only approve browser origins on this machine: the Vite dev server and
        // 127.0.0.1 variants. Other websites get no CORS approval, so they
        // cannot drive this API from a user's browser.
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin != null && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", origin);
            exchange.getResponseHeaders().add("Vary", "Origin");
        }
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
        exchange.getResponseHeaders().add("Access-Control-Max-Age", "3600");
    }

    private void respond(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = body == null ? new byte[0] : Json.write(body).getBytes(StandardCharsets.UTF_8);
        if (bytes.length > 0) {
            exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        }
        exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        if (bytes.length > 0) {
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }
}
