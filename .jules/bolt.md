## 2024-10-25 - React.memo on Log Streams
**Learning:** Frequent array renders inside streaming logs block the main thread and drop frames. Wrapping inline mapped components in `React.memo` for logs components stops VDOM generation.
**Action:** Always wrap dynamically mapped streaming objects (like logs, sockets, real-time metrics) inside `React.memo` to skip diffing untouced components.

## 2025-02-23 - Order of String Operations
**Learning:** Performing `includes()` checks on unconstrained user input or error messages can cause performance issues if the string is massive (e.g., HTML bodies).
**Action:** Always constrain string length (via `substring` or `slice`) *before* executing substring searches like `includes()` on potentially large text payloads.
