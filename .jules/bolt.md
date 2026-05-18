## 2024-10-25 - React.memo on Log Streams
**Learning:** Frequent array renders inside streaming logs block the main thread and drop frames. Wrapping inline mapped components in `React.memo` for logs components stops VDOM generation.
**Action:** Always wrap dynamically mapped streaming objects (like logs, sockets, real-time metrics) inside `React.memo` to skip diffing untouced components.

## 2024-05-17 - Avoid Unnecessary `async`/`await` on Synchronous Functions
**Learning:** Marking a purely synchronous function (like `addLog`) as `async` causes JavaScript to wrap its return value in a Promise and push its execution onto the microtask queue. When called frequently, this unnecessary overhead blocks execution and reduces performance.
**Action:** Remove `async` and `await` keywords from functions that perform purely synchronous operations (e.g., object creation, array manipulation, and emitting socket events) to improve execution speed and reduce microtask queue pressure.
## 2025-05-18 - [React.memo() Requires useCallback for Props]
**Learning:** When trying to optimize list items using `React.memo()`, function references passed as props will trigger re-renders if they are defined inline or normally in the parent component body. In a React/Vite frontend using global streaming state (like logs or heat level), this completely defeats the memoization attempt.
**Action:** Always wrap event handler callbacks (`onRefresh`, `onDelete`) in the parent component with `useCallback` when passing them down to a `React.memo` wrapped child component to ensure the function references are stable across renders.
