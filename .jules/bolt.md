## 2024-10-25 - React.memo on Log Streams
**Learning:** Frequent array renders inside streaming logs block the main thread and drop frames. Wrapping inline mapped components in `React.memo` for logs components stops VDOM generation.
**Action:** Always wrap dynamically mapped streaming objects (like logs, sockets, real-time metrics) inside `React.memo` to skip diffing untouced components.

## 2024-05-17 - Avoid Unnecessary `async`/`await` on Synchronous Functions
**Learning:** Marking a purely synchronous function (like `addLog`) as `async` causes JavaScript to wrap its return value in a Promise and push its execution onto the microtask queue. When called frequently, this unnecessary overhead blocks execution and reduces performance.
**Action:** Remove `async` and `await` keywords from functions that perform purely synchronous operations (e.g., object creation, array manipulation, and emitting socket events) to improve execution speed and reduce microtask queue pressure.
\n## 2026-05-18 - Optimize first-element lookups in objects\n**Learning:** Using `Object.values(obj)` just to access the first element or check if an object has entries creates unnecessary arrays, taking O(n) memory and time. When run inside render loops (like `categories.map`), this causes high memory allocation and garbage collection overhead.\n**Action:** Use a `for...in` loop with an early return (or `break`) to efficiently grab the first matching element from an object instead of generating the entire values array.
