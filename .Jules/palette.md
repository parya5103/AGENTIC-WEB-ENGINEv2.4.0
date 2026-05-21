## 2024-05-16 - Added ARIA labels to icon-only buttons
**Learning:** React components containing icon-only buttons lacked essential ARIA labels, rendering them inaccessible to screen readers. Specifically, the Sidebar navigation items and PageHeader notification/console toggles needed `aria-label` and `aria-current` attributes to provide context.
**Action:** Always verify that icon-only interactive elements possess descriptive `aria-label` attributes to ensure keyboard accessibility and proper screen reader behavior.
## 2026-05-20 - Adding ARIA labels to Icon-Only Buttons
**Learning:** Adding `aria-label` and visual focus indicators (`focus-visible`) to icon-only buttons significantly improves keyboard navigation accessibility and screen reader support without changing visual layout for pointer users.
**Action:** Add these attributes as standard practice for any actionable UI elements that lack descriptive text.
## 2024-02-14 - Input Labeling & Icon Button Accessibility
**Learning:** Identified a pattern in custom components where standalone inputs (like range sliders and text inputs) lacked proper programmatic association with their visible labels, relying solely on sibling `span` elements or visual proximity. Additionally, custom icon-only actions lacked accessible names.
**Action:** Ensure all visible text labels are semantically wrapped in `<label>` elements and linked to inputs via matching `htmlFor`/`id` pairs. Enforce `aria-label` and `title` on icon-only buttons while providing `focus-visible` states for keyboard navigation.
