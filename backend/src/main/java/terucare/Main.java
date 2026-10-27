package terucare;

import terucare.server.ApiServer;
import terucare.service.ExpenseService;
import terucare.store.FileStore;

import java.nio.file.Path;

/**
 * Teru Care backend entry point.
 *
 *   compile:  javac -encoding UTF-8 -d out $(all .java under src)
 *   run:      java -cp out terucare.Main [port]
 *
 * Default port 8090 (override: first argument or TERU_PORT env var).
 */
public class Main {

    public static void main(String[] args) throws Exception {
        int port = resolvePort(args);

        Path dataFile = Path.of("data", "expenses.json");
        FileStore store = new FileStore(dataFile);
        ExpenseService service = new ExpenseService(store);
        ApiServer api = new ApiServer(service, port);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n[Teru Care] Shutting down...");
            api.stop();
        }));

        api.start();
        System.out.println("==============================================");
        System.out.println("  Teru Care - Personal Finance & Expense Tracker");
        System.out.println("  CSA201 Data Structures & Algorithms backend");
        System.out.println("==============================================");
        System.out.println("  API      : http://localhost:" + port + "/api");
        System.out.println("  Health   : http://localhost:" + port + "/api/health");
        System.out.println("  Storage  : " + dataFile.toAbsolutePath());
        System.out.println("  Stop     : press Ctrl+C in this window");
        System.out.println("==============================================");
    }

    private static int resolvePort(String[] args) {
        if (args.length > 0) {
            try {
                return Integer.parseInt(args[0]);
            } catch (NumberFormatException ignored) {
            }
        }
        String env = System.getenv("TERU_PORT");
        if (env != null) {
            try {
                return Integer.parseInt(env);
            } catch (NumberFormatException ignored) {
            }
        }
        return 8090;
    }
}
