package terucare.dsa;

import org.junit.Test;
import static org.junit.Assert.*;

public class StackTest {

    @Test
    void pushPopPeekLIFO() {
        Stack<String> s = new Stack<>();
        s.push("a");
        s.push("b");
        assertEquals("b", s.peek());
        assertEquals("b", s.pop());
        assertEquals("a", s.pop());
        assertTrue(s.isEmpty());
    }

    @Test
    void emptyPopReturnsNull() {
        Stack<String> s = new Stack<>();
        assertNull(s.pop());
        assertNull(s.peek());
    }

    @Test
    void clear() {
        Stack<String> s = new Stack<>();
        s.push("a");
        s.clear();
        assertTrue(s.isEmpty());
        assertEquals(0, s.size());
    }

    @Test
    void sizeMatches() {
        Stack<Integer> s = new Stack<>();
        assertEquals(0, s.size());
        s.push(1);
        assertEquals(1, s.size());
        s.push(2);
        assertEquals(2, s.size());
        s.pop();
        assertEquals(1, s.size());
    }
}
