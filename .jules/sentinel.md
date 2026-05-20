## 2026-05-16 - [Secret Leak] Fix API Key hardcoding
**Vulnerability:** The `vite.config.ts` exposes the `GEMINI_API_KEY` to the client bundle via Vite's `define`, which means any user using the client app gets the backend API key leaked to them.
**Learning:** API Keys should never be leaked via `define` to the client in Vite apps, because Vite builds are executed on the client. It appears `src/lib/intelligence.ts` is also accessing this key via `process.env.GEMINI_API_KEY` which means it is intended for the client, so it's a critical secret leak.
**Prevention:** Server-only code should handle API key interactions. Client code should make API requests to the server (e.g. `/api/...`) and the server makes the final calls to external APIs.

## 2024-05-17
* **Vulnerability:** Overly permissive CORS configuration on Socket.IO server (`cors: { origin: "*" }`).
* **Risk:** Cross-Origin Resource Sharing (CORS) set to `*` allows any website to connect to the Socket.IO server. An attacker could host a malicious site, and if a user visits it, the site could communicate with the local server to extract data or perform unauthorized actions.
* **Fix:** Restricted the `origin` to `process.env.CORS_ORIGIN` (split by commas) if provided, or otherwise restricted to local development addresses `["http://localhost:${PORT}", "http://127.0.0.1:${PORT}"]`. This prevents cross-origin attacks while allowing local functionality.

## 2026-05-20 - [HIGH] Fix XSS vulnerability in HTML renderer
**Vulnerability:** The application was dynamically interpolating user/AI-generated content directly into raw HTML strings in `lib/server/renderer.ts` without sanitization, leading to a critical Cross-Site Scripting (XSS) vulnerability.
**Learning:** When manually constructing HTML on the server-side, string interpolation of dynamic properties (`.slug`, `.name`, `.description`, `.title`, `.excerpt`, `.imageUrl`, and `.content`) exposes the application to XSS attacks if not properly sanitized.
**Prevention:** Always implement and use an `escapeHtml` utility to properly encode HTML entities (`&`, `<`, `>`, `"`, `'`) for any dynamic input before interpolating it into HTML templates.
