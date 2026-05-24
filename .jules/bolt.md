## 2024-10-25 - React.memo on Log Streams
**Learning:** Frequent array renders inside streaming logs block the main thread and drop frames. Wrapping inline mapped components in `React.memo` for logs components stops VDOM generation.
**Action:** Always wrap dynamically mapped streaming objects (like logs, sockets, real-time metrics) inside `React.memo` to skip diffing untouced components.

## 2024-05-17 - Avoid Unnecessary `async`/`await` on Synchronous Functions
**Learning:** Marking a purely synchronous function (like `addLog`) as `async` causes JavaScript to wrap its return value in a Promise and push its execution onto the microtask queue. When called frequently, this unnecessary overhead blocks execution and reduces performance.
**Action:** Remove `async` and `await` keywords from functions that perform purely synchronous operations (e.g., object creation, array manipulation, and emitting socket events) to improve execution speed and reduce microtask queue pressure.

## 2026-05-24 - Memoize List Components to Prevent Re-renders
**Learning:** Frequent websocket state updates (like logs) cause full application re-renders, impacting performance. Wrapping complex list elements in `React.memo` and wrapping their event handlers in `useCallback` prevents main-thread CPU blocking and O(n) re-renders in React architectures.
**Action:** Extract inline mapped list items into separate components and wrap them in `React.memo` with memoized callbacks when they are part of a component receiving frequent state updates.
