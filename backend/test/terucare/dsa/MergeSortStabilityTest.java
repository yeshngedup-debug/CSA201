package terucare.dsa;

import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Verifies MergeSort.sort is a stable, generic merge sort.
 * Stability: equal elements preserve their original relative order.
 */
public class MergeSortStabilityTest {

    /** Simple pair with a value; equal values should retain insertion order. */
    private record KV(String name, int order) {}

    @Test
    void stableOnEqualValues() {
        // All equal values; after sorting by value (constant), the order should be unchanged.
        KV a = new KV("a", 0);
        KV b = new KV("b", 1);
        KV c = new KV("c", 2);
        java.util.List<KV> input = java.util.List.of(a, b, c);
        java.util.List<KV> sorted = MergeSort.sort(input, (x, y) -> 0); // always equal -> stable
        assertSame(a, sorted.get(0));
        assertSame(b, sorted.get(1));
        assertSame(c, sorted.get(2));
    }
}
