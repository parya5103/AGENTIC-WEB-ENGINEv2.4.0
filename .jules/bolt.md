## 2024-10-25 - React.memo on Log Streams
**Learning:** Frequent array renders inside streaming logs block the main thread and drop frames. Wrapping inline mapped components in `React.memo` for logs components stops VDOM generation.
**Action:** Always wrap dynamically mapped streaming objects (like logs, sockets, real-time metrics) inside `React.memo` to skip diffing untouced components.

## 2024-05-17 - Avoid Unnecessary `async`/`await` on Synchronous Functions
**Learning:** Marking a purely synchronous function (like `addLog`) as `async` causes JavaScript to wrap its return value in a Promise and push its execution onto the microtask queue. When called frequently, this unnecessary overhead blocks execution and reduces performance.
**Action:** Remove `async` and `await` keywords from functions that perform purely synchronous operations (e.g., object creation, array manipulation, and emitting socket events) to improve execution speed and reduce microtask queue pressure.

## 2024-10-25 - Memoize Expensive Components Alongside Streaming State
**Learning:** Frequent array rendering, such as high-velocity websocket log streaming, triggers parent re-renders. Complex sibling components (like a StatsGrid or large chart) will unnecessarily re-render and drop frames, even if their own props remain stable.
**Action:** Always wrap heavy layout or data-visualization sibling components with `React.memo` if they share a parent with high-frequency streaming state updates.
