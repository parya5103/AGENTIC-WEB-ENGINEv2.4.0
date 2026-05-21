## 2024-05-16 - Added ARIA labels to icon-only buttons
**Learning:** React components containing icon-only buttons lacked essential ARIA labels, rendering them inaccessible to screen readers. Specifically, the Sidebar navigation items and PageHeader notification/console toggles needed `aria-label` and `aria-current` attributes to provide context.
**Action:** Always verify that icon-only interactive elements possess descriptive `aria-label` attributes to ensure keyboard accessibility and proper screen reader behavior.
## 2026-05-20 - Adding ARIA labels to Icon-Only Buttons
**Learning:** Adding `aria-label` and visual focus indicators (`focus-visible`) to icon-only buttons significantly improves keyboard navigation accessibility and screen reader support without changing visual layout for pointer users.
**Action:** Add these attributes as standard practice for any actionable UI elements that lack descriptive text.
