package terucare.server;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal JSON parser and writer implemented from scratch, so the backend
 * needs NO external libraries — plain JDK only.
 *
 * parse(String) -> Object, where:
 *   { ... }  -> LinkedHashMap<String, Object>   (key order preserved)
 *   [ ... ]  -> ArrayList<Object>
 *   "..."    -> String
 *   number   -> Double
 *   true/false -> Boolean
 *   null     -> null
 *
 * write(Object) does the inverse; Maps become objects, Lists become arrays,
 * Long/Integer/Double become numbers, everything else must be String/Boolean/null.
 */
public final class Json {

    /** Thrown for malformed JSON input. */
    public static final class ParseException extends IllegalArgumentException {
        public ParseException(String message) {
            super(message);
        }
    }

    private Json() {
    }

    // ─── Parsing ─────────────────────────────────────────────────────────

    public static Object parse(String text) {
        Parser p = new Parser(text);
        p.skipWhitespace();
        Object value = p.parseValue();
        p.skipWhitespace();
        if (!p.atEnd()) throw p.error("Unexpected trailing characters");
        return value;
    }

    private static final class Parser {
        private final String s;
        private int i;

        Parser(String s) {
            this.s = s;
        }

        boolean atEnd() {
            return i >= s.length();
        }

        IllegalArgumentException error(String message) {
            return new ParseException("Invalid JSON at position " + i + ": " + message);
        }

        void skipWhitespace() {
            while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
        }

        char peek() {
            if (atEnd()) throw error("Unexpected end of input");
            return s.charAt(i);
        }

        Object parseValue() {
            char c = peek();
            switch (c) {
                case '{': return parseObject();
                case '[': return parseArray();
                case '"': return parseString();
                case 't': expectWord("true"); return Boolean.TRUE;
                case 'f': expectWord("false"); return Boolean.FALSE;
                case 'n': expectWord("null"); return null;
                default:
                    if (c == '-' || (c >= '0' && c <= '9')) return parseNumber();
                    throw error("Unexpected character '" + c + "'");
            }
        }

        void expectWord(String word) {
            if (!s.startsWith(word, i)) throw error("Invalid literal");
            i += word.length();
        }

        Map<String, Object> parseObject() {
            Map<String, Object> map = new LinkedHashMap<>();
            i++; // consume '{'
            skipWhitespace();
            if (peek() == '}') { i++; return map; }
            while (true) {
                skipWhitespace();
                if (peek() != '"') throw error("Expected string key");
                String key = parseString();
                skipWhitespace();
                if (peek() != ':') throw error("Expected ':'");
                i++; // consume ':'
                skipWhitespace();
                map.put(key, parseValue());
                skipWhitespace();
                char c = peek();
                if (c == ',') { i++; continue; }
                if (c == '}') { i++; return map; }
                throw error("Expected ',' or '}'");
            }
        }

        List<Object> parseArray() {
            List<Object> list = new ArrayList<>();
            i++; // consume '['
            skipWhitespace();
            if (peek() == ']') { i++; return list; }
            while (true) {
                skipWhitespace();
                list.add(parseValue());
                skipWhitespace();
                char c = peek();
                if (c == ',') { i++; continue; }
                if (c == ']') { i++; return list; }
                throw error("Expected ',' or ']'");
            }
        }

        String parseString() {
            i++; // consume opening '"'
            StringBuilder sb = new StringBuilder();
            while (true) {
                if (atEnd()) throw error("Unterminated string");
                char c = s.charAt(i++);
                if (c == '"') return sb.toString();
                if (c == '\\') {
                    if (atEnd()) throw error("Unterminated escape sequence");
                    char esc = s.charAt(i++);
                    switch (esc) {
                        case '"': sb.append('"'); break;
                        case '\\': sb.append('\\'); break;
                        case '/': sb.append('/'); break;
                        case 'b': sb.append('\b'); break;
                        case 'f': sb.append('\f'); break;
                        case 'n': sb.append('\n'); break;
                        case 'r': sb.append('\r'); break;
                        case 't': sb.append('\t'); break;
                        case 'u':
                            if (i + 4 > s.length()) throw error("Invalid unicode escape");
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                            i += 4;
                            break;
                        default: throw error("Invalid escape '\\" + esc + "'");
                    }
                } else {
                    sb.append(c);
                }
            }
        }

        Double parseNumber() {
            int start = i;
            while (!atEnd()) {
                char c = s.charAt(i);
                if ((c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E') i++;
                else break;
            }
            try {
                return Double.parseDouble(s.substring(start, i));
            } catch (NumberFormatException e) {
                throw error("Invalid number");
            }
        }
    }

    // ─── Writing ─────────────────────────────────────────────────────────

    public static String write(Object value) {
        StringBuilder sb = new StringBuilder();
        writeValue(value, sb);
        return sb.toString();
    }

    private static void writeValue(Object value, StringBuilder sb) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof String s) {
            writeString(s, sb);
        } else if (value instanceof Boolean b) {
            sb.append(b);
        } else if (value instanceof Double d) {
            writeNumber(d, sb);
        } else if (value instanceof Number n) {
            sb.append(n);
        } else if (value instanceof Map<?, ?> map) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                writeString(String.valueOf(e.getKey()), sb);
                sb.append(':');
                writeValue(e.getValue(), sb);
            }
            sb.append('}');
        } else if (value instanceof List<?> list) {
            sb.append('[');
            for (int k = 0; k < list.size(); k++) {
                if (k > 0) sb.append(',');
                writeValue(list.get(k), sb);
            }
            sb.append(']');
        } else {
            throw new IllegalArgumentException("Cannot serialize type: " + value.getClass().getName());
        }
    }

    /** Whole numbers print without a decimal point (120.0 -> 120) for cleaner payloads. */
    private static void writeNumber(double d, StringBuilder sb) {
        if (Double.isNaN(d) || Double.isInfinite(d)) throw new IllegalArgumentException("Non-finite number");
        if (d == Math.rint(d) && Math.abs(d) < 9.0E15) {
            sb.append((long) d);
        } else {
            sb.append(d);
        }
    }

    private static void writeString(String s, StringBuilder sb) {
        sb.append('"');
        for (int k = 0; k < s.length(); k++) {
            char c = s.charAt(k);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        sb.append('"');
    }
}
