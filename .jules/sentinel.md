## 2026-05-16 - [Secret Leak] Fix API Key hardcoding
**Vulnerability:** The `vite.config.ts` exposes the `GEMINI_API_KEY` to the client bundle via Vite's `define`, which means any user using the client app gets the backend API key leaked to them.
**Learning:** API Keys should never be leaked via `define` to the client in Vite apps, because Vite builds are executed on the client. It appears `src/lib/intelligence.ts` is also accessing this key via `process.env.GEMINI_API_KEY` which means it is intended for the client, so it's a critical secret leak.
**Prevention:** Server-only code should handle API key interactions. Client code should make API requests to the server (e.g. `/api/...`) and the server makes the final calls to external APIs.
