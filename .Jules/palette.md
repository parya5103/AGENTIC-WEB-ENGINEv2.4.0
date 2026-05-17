## 2024-05-16 - Added ARIA labels to icon-only buttons
**Learning:** React components containing icon-only buttons lacked essential ARIA labels, rendering them inaccessible to screen readers. Specifically, the Sidebar navigation items and PageHeader notification/console toggles needed `aria-label` and `aria-current` attributes to provide context.
**Action:** Always verify that icon-only interactive elements possess descriptive `aria-label` attributes to ensure keyboard accessibility and proper screen reader behavior.
## 2024-05-17 - Button State Accessibility
**Learning:** Adding `disabled` attribute along with visual styles (like `cursor-not-allowed` and greying out) provides a strong, unified disabled state for elements like the AdSense form submit button, significantly improving feedback for screen reader and keyboard users alike.
**Action:** Always pair visual disabled states with the native `disabled` HTML attribute or appropriate `aria-disabled` if the element isn't a native form control.
