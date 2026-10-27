package terucare.dsa;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Merge Sort implemented from scratch (no Arrays.sort / Collections.sort).
 *
 * Divide and conquer:
 *   1. DIVIDE  the list into two halves,
 *   2. CONQUER sort each half recursively,
 *   3. COMBINE merge the two sorted halves back together.
 *
 * Time complexity:  O(n log n) in the best, average AND worst case.
 * Space complexity: O(n) for the temporary merge buffers.
 * The sort is stable (equal elements keep their relative order).
 *
 * Used by Teru Care for Functional Requirement 8: "Rank spending categories
 * using a Sorting Algorithm" — the dashboard's Top Category and ranked
 * Category Breakdown come straight out of this method.
 */
public final class MergeSort {

    private MergeSort() {
        // static utility class — no instances
    }

    /** Returns a NEW sorted list; the input list is not modified. */
    public static <T> List<T> sort(List<T> input, Comparator<T> comparator) {
        if (input.size() <= 1) return new ArrayList<>(input);
        return mergeSort(new ArrayList<>(input), comparator);
    }

    private static <T> List<T> mergeSort(List<T> items, Comparator<T> comparator) {
        // Base case: a list of 0 or 1 elements is already sorted.
        if (items.size() <= 1) return items;

        // DIVIDE
        int mid = items.size() / 2;
        List<T> left = mergeSort(new ArrayList<>(items.subList(0, mid)), comparator);
        List<T> right = mergeSort(new ArrayList<>(items.subList(mid, items.size())), comparator);

        // COMBINE
        return merge(left, right, comparator);
    }

    /** Merge two already-sorted lists into one sorted list. */
    private static <T> List<T> merge(List<T> left, List<T> right, Comparator<T> comparator) {
        List<T> result = new ArrayList<>(left.size() + right.size());
        int i = 0, j = 0;

        while (i < left.size() && j < right.size()) {
            if (comparator.compare(left.get(i), right.get(j)) <= 0) {
                result.add(left.get(i++));   // left element wins ties (stability)
            } else {
                result.add(right.get(j++));
            }
        }
        while (i < left.size()) result.add(left.get(i++));   // drain leftovers
        while (j < right.size()) result.add(right.get(j++));

        return result;
    }
}
