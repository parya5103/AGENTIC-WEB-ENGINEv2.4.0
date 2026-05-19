## 2024-05-16 - Added ARIA labels to icon-only buttons
**Learning:** React components containing icon-only buttons lacked essential ARIA labels, rendering them inaccessible to screen readers. Specifically, the Sidebar navigation items and PageHeader notification/console toggles needed `aria-label` and `aria-current` attributes to provide context.
**Action:** Always verify that icon-only interactive elements possess descriptive `aria-label` attributes to ensure keyboard accessibility and proper screen reader behavior.
## 2026-05-19 - Proper Label Association for Custom Form Inputs
**Learning:** Custom form inputs like range sliders and standard inputs often lack accessibility if they only have styled text acting as visual labels. Specifically in the ForgeCore component, inputs and visual labels weren't linked, hurting click-to-focus behavior and screen reader utility.
**Action:** Always ensure `label` elements have an `htmlFor` property matching the corresponding input's `id`, or wrap the input inside the label to maintain proper UX and a11y.
