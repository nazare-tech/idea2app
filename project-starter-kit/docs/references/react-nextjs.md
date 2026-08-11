# Optional React And Next.js Guidance

Use only when the project actually uses React or Next.js. Keep exact versions and exceptions in `PROJECT_CONTEXT.md`.

- Prefer Server Components by default in Next.js; add client boundaries only for interaction or browser APIs.
- Keep data fetching and authorization server-side where practical.
- Never treat client-supplied user, organization, price, entitlement, or ownership fields as authority.
- Keep shared UI metadata in typed registries when several surfaces consume it.
- Extract reusable hooks/components for repeated behavior, not for hypothetical reuse.
- Avoid broad context/store ownership for frequently changing state; colocate it near consumers.
- For streams, polling, effects, subscriptions, and timers, test cleanup, navigation, retry, visibility, stale response, and out-of-order behavior.
- Use route-level loading/error boundaries and explicit empty/retry states.
- Prefer progressive rendering and lazy loading for heavy below-the-fold content.
- Use semantic design tokens and existing primitives. Verify keyboard behavior, focus, responsive layouts, reduced motion, and WCAG AA contrast.
- Run focused tests, typecheck, lint, production build, and a real browser flow appropriate to the change.
