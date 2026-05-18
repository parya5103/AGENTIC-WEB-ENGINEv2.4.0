## 2024-05-16 - Added ARIA labels to icon-only buttons
**Learning:** React components containing icon-only buttons lacked essential ARIA labels, rendering them inaccessible to screen readers. Specifically, the Sidebar navigation items and PageHeader notification/console toggles needed `aria-label` and `aria-current` attributes to provide context.
**Action:** Always verify that icon-only interactive elements possess descriptive `aria-label` attributes to ensure keyboard accessibility and proper screen reader behavior.

## 2024-05-18 - Input-Label Associations & Icon Buttons
**Learning:** Found configuration form inputs lacking `id` properties with labels missing `htmlFor` attributes, which broke focus interaction and screen reader context. Additionally, several utility icon-only buttons lacked `aria-label`s.
**Action:** Always verify that form labels are explicitly associated with their inputs using `htmlFor` and `id`, and ensure all icon-only interactive elements possess descriptive `aria-label` attributes.
